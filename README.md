
# Local Media Server (LMS)

LMS is a media server that can be run in-place. Just run `lms-server`
in the directory you want to serve and LMS will spin up a web server
and serve the media in that directory. If LMS has write permissions in
the directory, it'll create a `.lms-cache` directory; otherwise, it'll
use your system's temporary directory for caching instead.
