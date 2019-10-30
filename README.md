
# mklapse

Make time-lapses in time-lapse speed

1. `cd` to a directory of photos
2. Run `mklapse [mode]` (See examples below)

## Examples
Running each mode (except video) will create a directory of new images in the current directory (the directory created will be named `mklapse`).

### Star Trails
![star trails gif](gifs/star-trails.gif)  
`$ mklapse trails [--reverse]`  
![mklapse video](gifs/mklapse-trails.gif)  

### Zoom
![zooming in on a beetle](gifs/zoom_beetle.gif)  
`$ mklapse zoom [--delta 1.01]`  
*TODO: add parameter for focal point*

### Star Trails + Zoom
![zoom, then star trails gif](gifs/star_trails_zoom.gif)  
`$ mklapse zoom && cd mklapse && mklapse trails`  

### Time-lapse
![typical time-lapse](gifs/milky-way.gif)  
`$ mklapse video`  
![mklapse video](gifs/mklapse-video.gif)  

This will create a video named `mklapse.mp4` made out of the images in the current directory.

### Custom Scripts
`$ mklapse custom --script name-of-script.sh [args for script here]`  
Run a custom script on every image in a directory.  

## Install
`npm i -g mklapse`

## Dependencies
* [Ffmpeg](https://ffmpeg.org)
* [ImageMagick](https://imagemagick.org)


## Motivation
* Batch edit images with simple commands
* Change variables every image while batch editing
* Use Node.js instead of Bash (but still call shell programs underneath)
