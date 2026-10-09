package app

import (
	"bytes"
	"context"
	"image"
	"image/jpeg"
	"log"
	"strings"

	"golang.org/x/image/draw"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/ui"
)

const (
	cropBox       = 280 // the side of the crop area, in DIPs
	avatarMaxSize = 512 // the side of an uploaded avatar, at most, in pixels
)

// profileForm is the state of the profile dialog.
type profileForm struct {
	nickname string
	busy     bool

	// The picture being cropped, shown at zoom times the size that covers
	// the crop area, moved by offset from its center.
	src      *image.RGBA
	srcBm    *ui.Bitmap
	zoom     float64
	offX     float32
	offY     float32
	cropping bool

	// pending is the cropped JPEG to upload on save, shown as preview.
	pending []byte
	preview *ui.Bitmap
}

func (a *App) openProfile() {
	d := &a.dialogs
	d.profile = true
	d.edit = profileForm{nickname: a.displayNickname()}
}

// displayNickname is the nickname to edit: the profile's, else the
// account's name.
func (a *App) displayNickname() string {
	if p := a.account.profile; p != nil && p.Nickname != nil {
		return *p.Nickname
	}
	if s := a.account.session; s != nil {
		return s.User.Metadata("full_name")
	}
	return ""
}

// pickAvatar asks for a picture to crop.
func (a *App) pickAvatar() {
	f := &a.dialogs.edit
	go func() {
		paths, err := mygo.Dialog.Open(mygo.OpenDialogOptions{
			Title:   a.t("auth.profile.upload_avatar"),
			Filters: []mygo.FileFilter{{Name: "Images", Extensions: []string{"png", "jpg", "jpeg", "gif", "webp"}}},
		})
		if err != nil || len(paths) == 0 {
			return
		}
		img, err := loadPicture(paths[0])
		a.post(func() {
			if err != nil {
				log.Printf("open picture: %v", err)
				a.toast("error", a.t("auth.profile.error"))
				return
			}
			f.src, f.srcBm, f.zoom, f.offX, f.offY, f.cropping = img, ui.NewBitmap(img), 1, 0, 0, true
		})
	}()
}

// cropScale is how many DIPs a pixel of the picture takes in the crop area.
func (f *profileForm) cropScale() float32 {
	b := f.src.Bounds()
	cover := float32(cropBox) / float32(min(b.Dx(), b.Dy()))
	return cover * float32(f.zoom)
}

// cropRect is where the picture shows in the crop area, relative to it.
func (f *profileForm) cropRect() ui.Rect {
	b := f.src.Bounds()
	s := f.cropScale()
	w, h := float32(b.Dx())*s, float32(b.Dy())*s
	// The picture always covers the area.
	maxX, maxY := (w-cropBox)/2, (h-cropBox)/2
	f.offX = min(max(f.offX, -maxX), maxX)
	f.offY = min(max(f.offY, -maxY), maxY)
	return ui.Rect{X: (cropBox-w)/2 + f.offX, Y: (cropBox-h)/2 + f.offY, W: w, H: h}
}

// cropArea returns the part of the picture the crop area shows.
func (f *profileForm) cropArea() image.Rectangle {
	r, s, b := f.cropRect(), f.cropScale(), f.src.Bounds()
	x0, y0 := b.Min.X+int(-r.X/s), b.Min.Y+int(-r.Y/s)
	side := int(cropBox / s)
	return image.Rect(x0, y0, x0+side, y0+side).Intersect(b)
}

// cropJPEG cuts area out of src into a JPEG at most avatarMaxSize wide.
func cropJPEG(src *image.RGBA, area image.Rectangle) ([]byte, error) {
	size := min(area.Dx(), avatarMaxSize)
	dst := image.NewRGBA(image.Rect(0, 0, size, size))
	draw.CatmullRom.Scale(dst, dst.Bounds(), src, area, draw.Src, nil)
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 90}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// confirmCrop crops the picture off the main thread, for the preview and
// the upload on save.
func (a *App) confirmCrop() {
	f := &a.dialogs.edit
	src, area := f.src, f.cropArea()
	f.busy = true
	a.run(func(context.Context) func() {
		jpg, err := cropJPEG(src, area)
		var bm *ui.Bitmap
		if err == nil {
			bm, err = ui.DecodeBitmap(jpg)
		}
		return func() {
			f.busy = false
			if err != nil {
				log.Printf("crop avatar: %v", err)
				a.toast("error", a.t("auth.profile.error"))
				return
			}
			f.pending, f.preview, f.cropping, f.src, f.srcBm = jpg, bm, false, nil, nil
		}
	})
}

// saveProfile uploads the cropped picture, if any, and saves the profile.
func (a *App) saveProfile() {
	f := &a.dialogs.edit
	user, nickname, pending := a.userID(), strings.TrimSpace(f.nickname), f.pending
	avatarURL := a.avatarURL()
	f.busy = true
	a.run(func(ctx context.Context) func() {
		var err error
		if pending != nil {
			avatarURL, err = a.store.UploadAvatar(ctx, user, pending)
		}
		if err == nil {
			err = a.store.SaveProfile(ctx, user, nickname, avatarURL)
		}
		return func() {
			f.busy = false
			if err != nil {
				log.Printf("save profile: %v", err)
				a.toast("error", a.t("auth.profile.error"))
				return
			}
			a.dialogs.profile = false
			a.loadProfile()
			a.toast("success", a.t("auth.profile.success"))
		}
	})
}

func (a *App) profileDialog(c *ui.Context) {
	d := &a.dialogs
	f := &d.edit
	pal := a.pal
	if !d.profile && f.src != nil {
		// Closed while cropping: let the picture go.
		f.cropping, f.src, f.srcBm = false, nil, nil
	}
	a.dialogPanel(c, &d.profile, 420, func() {
		if f.cropping {
			a.cropView(c, f)
			return
		}
		ui.Column(c).Gap(4).Children(func() {
			ui.Text(c, a.t("auth.profile.title")).FontSize(20).Bold()
			ui.Text(c, a.t("auth.profile.description")).FontSize(14).TextColor(pal.mutedForeground)
		})
		ui.Column(c).AlignItems(ui.Center).Gap(8).PaddingY(8).Children(func() {
			pic := ui.Button(c, "").Label(a.t("auth.profile.upload_avatar")).
				Padding(0).Radius(48).Size(96, 96).Clip().Tooltip(a.t("auth.profile.upload_avatar"))
			pic.Children(func() {
				if f.preview != nil {
					ui.Image(c, f.preview).Size(96, 96).Fit(ui.Cover)
				} else {
					a.avatarImage(c, 96)
				}
				if pic.Hovered() {
					ui.Box(c).Absolute().Top(0).Left(0).Size(96, 96).Background(ui.RGBA(0, 0, 0, 0.4)).Center().Children(func() {
						ui.Icon(c, iconCamera).FontSize(28).TextColor(ui.Hex("#ffffff"))
					})
				}
			})
			if pic.Clicked() {
				a.pickAvatar()
			}
			ui.Text(c, a.t("auth.profile.upload_avatar")).FontSize(13).TextColor(pal.mutedForeground)
		})
		ui.Column(c).Gap(6).Children(func() {
			ui.Text(c, a.t("auth.profile.nickname")).FontSize(14).Bold()
			if ui.TextInput(c, &f.nickname).Placeholder(a.t("auth.profile.nickname_placeholder")).
				Label(a.t("auth.profile.nickname")).AutoFocus().Submitted() && !f.busy {
				a.saveProfile()
			}
		})
		ui.Row(c).Gap(8).Justify(ui.End).Children(func() {
			if ui.Button(c, a.t("auth.profile.cancel")).Clicked() {
				d.profile = false
			}
			if ui.PrimaryButton(c, a.t("auth.profile.save")).Disabled(f.busy).Clicked() {
				a.saveProfile()
			}
		})
	})
}

// cropView crops the picked picture to a circle: drag to move, slide to
// zoom.
func (a *App) cropView(c *ui.Context, f *profileForm) {
	pal := a.pal
	ui.Column(c).Gap(4).Children(func() {
		ui.Text(c, a.t("auth.profile.crop_title")).FontSize(20).Bold()
		ui.Text(c, a.t("auth.profile.crop_description")).FontSize(14).TextColor(pal.mutedForeground)
	})
	area := ui.Box(c).Size(cropBox, cropBox).AlignSelf(ui.Center).Radius(12).Clip().Cursor(ui.CursorGrab).Background(pal.muted)
	if dx, dy, ok := area.Dragged(); ok {
		f.offX += dx
		f.offY += dy
		area.Cursor(ui.CursorGrabbing)
	}
	r := f.cropRect()
	bm := f.srcBm
	area.Draw(func(p *ui.Painter, box ui.Rect) {
		p.Image(bm, ui.Rect{X: box.X + r.X, Y: box.Y + r.Y, W: r.W, H: r.H}, ui.FillBox)
		// Dim what falls outside the circle the avatar shows.
		var ring ui.Path
		ring.Circle(box.X+cropBox/2, box.Y+cropBox/2, cropBox/2+100)
		p.StrokePath(&ring, 200, ui.RGBA(0, 0, 0, 0.5))
		var edge ui.Path
		edge.Circle(box.X+cropBox/2, box.Y+cropBox/2, cropBox/2)
		p.StrokePath(&edge, 2, ui.RGBA(255, 255, 255, 0.9))
	})
	ui.Row(c).Gap(12).Children(func() {
		ui.Text(c, a.t("auth.profile.zoom")).FontSize(14)
		ui.Slider(c, &f.zoom, 1, 3).Grow(1).Label(a.t("auth.profile.zoom"))
	})
	ui.Row(c).Gap(8).Justify(ui.End).Children(func() {
		if ui.Button(c, a.t("auth.profile.cancel")).Clicked() {
			f.cropping, f.src, f.srcBm = false, nil, nil
		}
		if ui.PrimaryButton(c, a.t("auth.profile.confirm")).Disabled(f.busy).Clicked() {
			a.confirmCrop()
		}
	})
}
