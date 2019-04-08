front end: for each new front end, you can make a new dir front_xyz for individual files, and use _front/css, _front/js, and _front/assets for common files.

in somefile.html, use /common/css/fname.css (prefix /common corresponds to route leading to _front/css directory), see flask_app.py

(feel free to change it if you find a better way to do this as I am not sure this is best practice)

to run both server and frontend locally:
in terminal:
- after installing flask (pip install flask --user)
- cd tnt
- python flask_app.py
(when files are added or even sometimes when changed, need to stop server CtrlC and restart it!)

to use front_x, 
- browse to localhost:5000/x/

>I'll try to find a way to start browser automatically with server,
and also automatic reloading after change!

see flask_app.py to update routes




