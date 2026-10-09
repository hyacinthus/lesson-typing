package app

import (
	"encoding/binary"
	"image"
	"testing"
)

// exifJPEG returns the start of a JPEG whose EXIF data gives orientation o,
// in the byte order of order.
func exifJPEG(o uint16, big bool) []byte {
	var order binary.ByteOrder = binary.LittleEndian
	tiff := []byte("II*\x00\x08\x00\x00\x00")
	if big {
		order = binary.BigEndian
		tiff = []byte("MM\x00*\x00\x00\x00\x08")
	}
	ifd := make([]byte, 2+12+4)
	order.PutUint16(ifd, 1)
	order.PutUint16(ifd[2:], 0x0112)
	order.PutUint16(ifd[4:], 3) // SHORT
	order.PutUint32(ifd[6:], 1)
	order.PutUint16(ifd[10:], o)
	seg := append(append([]byte("Exif\x00\x00"), tiff...), ifd...)
	app1 := []byte{0xff, 0xe1, 0, 0}
	binary.BigEndian.PutUint16(app1[2:], uint16(len(seg)+2))
	jpeg := []byte{0xff, 0xd8}
	// An APP0 segment before, as cameras write.
	jpeg = append(jpeg, 0xff, 0xe0, 0, 4, 'J', 'F')
	jpeg = append(append(jpeg, app1...), seg...)
	return append(jpeg, 0xff, 0xda, 0, 2)
}

func TestEXIFOrientation(t *testing.T) {
	for _, big := range []bool{false, true} {
		for o := uint16(1); o <= 8; o++ {
			if got := exifOrientation(exifJPEG(o, big)); got != int(o) {
				t.Errorf("orientation %d (big endian %v) read as %d", o, big, got)
			}
		}
	}
	if exifOrientation([]byte("\x89PNG")) != 1 || exifOrientation([]byte{0xff, 0xd8, 0xff, 0xda, 0, 2}) != 1 {
		t.Error("orientation without EXIF data")
	}
}

func TestOrient(t *testing.T) {
	// A 2×3 picture whose pixels are numbered 0 to 5, row by row:
	//   0 1
	//   2 3
	//   4 5
	src := image.NewRGBA(image.Rect(0, 0, 2, 3))
	for i := range 6 {
		src.Pix[4*i] = uint8(i)
	}
	rows := func(img *image.RGBA) [][]uint8 {
		var out [][]uint8
		for y := range img.Rect.Dy() {
			var row []uint8
			for x := range img.Rect.Dx() {
				row = append(row, img.Pix[img.PixOffset(x, y)])
			}
			out = append(out, row)
		}
		return out
	}
	want := map[int][][]uint8{
		1: {{0, 1}, {2, 3}, {4, 5}},
		2: {{1, 0}, {3, 2}, {5, 4}},
		3: {{5, 4}, {3, 2}, {1, 0}},
		4: {{4, 5}, {2, 3}, {0, 1}},
		5: {{0, 2, 4}, {1, 3, 5}},
		6: {{4, 2, 0}, {5, 3, 1}},
		7: {{5, 3, 1}, {4, 2, 0}},
		8: {{1, 3, 5}, {0, 2, 4}},
	}
	for o, w := range want {
		got := rows(orient(src, o))
		if len(got) != len(w) {
			t.Errorf("orientation %d: %v", o, got)
			continue
		}
		for y := range w {
			for x := range w[y] {
				if got[y][x] != w[y][x] {
					t.Errorf("orientation %d: %v, want %v", o, got, w)
					break
				}
			}
		}
	}
}

func TestCropArea(t *testing.T) {
	f := profileForm{src: image.NewRGBA(image.Rect(0, 0, 900, 600)), zoom: 1}
	// Zoom 1 shows the centered square of the short side.
	if got := f.cropArea(); got != image.Rect(150, 0, 750, 600) {
		t.Fatalf("centered: %v", got)
	}
	// Twice as large, the picture moved right by 70 DIPs: half the short
	// side, 75 pixels (70 DIPs at 280/300 DIPs a pixel) left of center.
	f.zoom, f.offX = 2, 70
	if got := f.cropArea(); got != image.Rect(225, 150, 525, 450) {
		t.Fatalf("zoomed: %v", got)
	}
	// Moves past the edge stop at it.
	f.offX = 10000
	if got := f.cropArea(); got.Min.X != 0 {
		t.Fatalf("clamped: %v", got)
	}
	jpg, err := cropJPEG(f.src, f.cropArea())
	if err != nil || len(jpg) == 0 {
		t.Fatal(err)
	}
}
