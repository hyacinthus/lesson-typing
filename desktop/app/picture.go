package app

import (
	"bytes"
	"encoding/binary"
	"image"
	"os"

	"golang.org/x/image/draw"

	// Formats a picked picture may come in, besides JPEG.
	_ "image/gif"
	_ "image/png"

	_ "golang.org/x/image/webp"
)

// maxPictureSide bounds the short side of a picked picture, which the crop
// area shows at most 3 times 280 DIPs wide: a phone's photo shrinks from
// tens of megabytes to a few.
const maxPictureSide = 1536

// loadPicture reads a picture, upright as its EXIF orientation says, as
// browsers show photos, and no larger than it needs to be.
func loadPicture(path string) (*image.RGBA, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	b := img.Bounds()
	scale := min(1, float64(maxPictureSide)/float64(min(b.Dx(), b.Dy())))
	small := image.NewRGBA(image.Rect(0, 0, max(1, int(float64(b.Dx())*scale)), max(1, int(float64(b.Dy())*scale))))
	draw.CatmullRom.Scale(small, small.Bounds(), img, b, draw.Src, nil)
	return orient(small, exifOrientation(data)), nil
}

// orient turns an image upright from its EXIF orientation, 1 to 8.
func orient(src *image.RGBA, o int) *image.RGBA {
	if o < 2 || o > 8 {
		return src
	}
	w, h := src.Rect.Dx(), src.Rect.Dy()
	dw, dh := w, h
	if o >= 5 { // a quarter turn swaps the sides
		dw, dh = h, w
	}
	dst := image.NewRGBA(image.Rect(0, 0, dw, dh))
	for y := range dh {
		for x := range dw {
			sx, sy := x, y
			switch o {
			case 2: // mirrored
				sx = w - 1 - x
			case 3: // upside down
				sx, sy = w-1-x, h-1-y
			case 4: // mirrored upside down
				sy = h - 1 - y
			case 5: // mirrored, a quarter turn counterclockwise
				sx, sy = y, x
			case 6: // a quarter turn clockwise
				sx, sy = y, h-1-x
			case 7: // mirrored, a quarter turn clockwise
				sx, sy = w-1-y, h-1-x
			case 8: // a quarter turn counterclockwise
				sx, sy = w-1-y, x
			}
			copy(dst.Pix[dst.PixOffset(x, y):][:4], src.Pix[src.PixOffset(src.Rect.Min.X+sx, src.Rect.Min.Y+sy):][:4])
		}
	}
	return dst
}

// exifOrientation returns the orientation a JPEG's EXIF data gives, 1
// (upright) when it has none.
func exifOrientation(data []byte) int {
	if len(data) < 4 || data[0] != 0xff || data[1] != 0xd8 {
		return 1
	}
	for i := 2; i+4 <= len(data) && data[i] == 0xff; {
		marker := data[i+1]
		size := int(binary.BigEndian.Uint16(data[i+2:]))
		if marker == 0xda || size < 2 || i+2+size > len(data) { // the image data
			break
		}
		seg := data[i+4 : i+2+size]
		if marker == 0xe1 && bytes.HasPrefix(seg, []byte("Exif\x00\x00")) {
			return tiffOrientation(seg[6:])
		}
		i += 2 + size
	}
	return 1
}

// tiffOrientation reads the Orientation tag of the first IFD of TIFF data.
func tiffOrientation(t []byte) int {
	if len(t) < 8 {
		return 1
	}
	var order binary.ByteOrder
	switch string(t[:2]) {
	case "II":
		order = binary.LittleEndian
	case "MM":
		order = binary.BigEndian
	default:
		return 1
	}
	ifd := int(order.Uint32(t[4:]))
	if ifd+2 > len(t) {
		return 1
	}
	n := int(order.Uint16(t[ifd:]))
	for k := range n {
		e := ifd + 2 + 12*k
		if e+12 > len(t) {
			break
		}
		if order.Uint16(t[e:]) == 0x0112 { // Orientation, a SHORT
			if o := int(order.Uint16(t[e+8:])); o >= 1 && o <= 8 {
				return o
			}
			break
		}
	}
	return 1
}
