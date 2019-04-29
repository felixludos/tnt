from passive_backend import *
from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
from flask_util import ActionConverter
import json
app = Flask(__name__, static_folder='_front')
CORS(app)

app.url_map.converters['action'] = ActionConverter


def convert_jsonable(msg):

	if isinstance(msg, dict):
		return {convert_jsonable(k): convert_jsonable(v) for k, v in msg.items()}
	if isinstance(msg, (list, tuple)):
		return [convert_jsonable(el) for el in msg]
	if isinstance(msg, set):
		return {'set': [convert_jsonable(el) for el in msg]}
	# if not isinstance(msg, str):
	# 	return str(msg)
	return msg

# def deepcopy_message(msg):
# 	if isinstance(msg, (tdict, adict)):
# 		return adict({deepcopy_message(k):deepcopy_message(v) for k,v in msg.items()})
# 	if isinstance(msg, idict):
# 		copy = msg.copy()
# 		copy._id = msg._id
# 		return copy
# 	if isinstance(msg, (list, tuple)):
# 		return type(msg)(deepcopy_message(el) for el in msg)
# 	if isinstance(msg, set):
# 		return xset(deepcopy_message(el) for el in msg)
# 	# if not isinstance(msg, str):
# 	# 	return str(msg)
# 	return msg


_visible_attrs = {  # attributes seen by all players even if obj isn't visible to the player
	'unit': {'nationality', 'tile', },
	'card': {'owner'},
}


def hide_objects(objects, player=None, cond=None):
	if cond is None:
		def cond(obj, player): return player not in obj.visible
	if player is None:
		return
	for obj in objects.values():
		if cond(obj, player):
			for k in list(obj.keys()):
				if k in obj and k not in {'visible', 'obj_type'} and \
						(obj['obj_type'] not in _visible_attrs or k not in _visible_attrs[obj['obj_type']]):
					del obj[k]


def format_msg_for_frontend(msg, player=None):

	msg = convert_jsonable(msg)

	def cond(obj, player): return player not in obj['visible']['set']

	if 'created' in msg:
		hide_objects(msg['created'], player=player, cond=cond)
	if 'updated' in msg:
		hide_objects(msg['updated'], player=player, cond=cond)
	if 'removed' in msg:
		hide_objects(msg['removed'], player=player, cond=cond)

	msg = json.dumps(msg)

	return msg


def unjsonify(msg):
	if isinstance(msg, dict):
		if len(msg) == 1 and 'set' in msg:
			return xset(unjsonify(el) for el in msg['set'])
		return adict({unjsonify(k): unjsonify(v) for k, v in msg.items()})
	if isinstance(msg, list):
		return tuple(unjsonify(el) for el in msg)
	# if not isinstance(msg, str):
	# 	return str(msg)
	return msg


def format_msg_to_python(msg):
	msg = unjsonify(json.loads(msg))
	return msg


FORMAT_MSG = format_msg_for_frontend


@app.route('/common/css/<fname>/')
def staticFilesCSSCommon(fname):
  return send_from_directory(app.static_folder, 'css/'+fname)

@app.route('/common/js/<fname>/')
def staticFilesJSCommon(fname):
  return send_from_directory(app.static_folder, 'js/'+fname)

@app.route('/common/assets/<fname>')
def staticFilesAssetsDir(fname):
	filename = fname
	return send_from_directory(app.static_folder, 'assets/'+fname)

@app.route('/common/assets/markers/<fname>')
def staticFilesAssetsMarkersDir(fname):
	filename = fname
	return send_from_directory(app.static_folder, 'assets/markers/'+fname)

@app.route('/common/assets/config/<fname>')
def staticFilesAssetsConfigDir(fname):
	filename = fname
	return send_from_directory(app.static_folder, 'assets/config/'+fname)

# @app.route('/lauren/')
# def defaultRouteStaticFiles():
#     return send_from_directory(app.static_folder, "front_lauren/index.html")

# @app.route('/lauren/<fname>')
# def staticFilesMainDirLauren(fname):
#     filename = fname
#     return send_from_directory(app.static_folder, "front_lauren/"+fname)

# @app.route('/felix/')
# def defaultRouteStaticFilesFelix():
#     return send_from_directory(app.static_folder, "front_felix/index.html")

# @app.route('/felix/<fname>')
# def staticFilesMainDirFelix(fname):
#     filename = fname
#     return send_from_directory(app.static_folder, "front_felix/"+fname)

@app.route('/0/')
def defaultRouteStaticFilesTawzz():
	return send_from_directory(app.static_folder, "front_0/index.html")

@app.route('/0/<fname>')
def staticFilesMainDirTawzz(fname):
	filename = fname
	return send_from_directory(app.static_folder, "front_0/"+fname)

@app.route("/")
def ping():
	return 'Backend active: use "init" to init game'

@app.route('/save/<filename>')
def save(filename=None):
	return save_gamestate(filename)

@app.route('/load/<data>')
def load(data):
	return load_gamestate(data)

@app.route('/testload/<data>')
def testload(data):
	load_gamestate('./saves/'+data)
	return './saves/'+data

@app.route('/reset/<player>')
def reset(player):
	return FORMAT_MSG(get_object_table(), player)

@app.route('/init/<game_type>/<player>')
def init_game(game_type='hotseat', player='Axis', debug=False):
	
	if not game_type == 'hotseat':
		return 'Error: Game type must be hotseat'
	out = FORMAT_MSG(start_new_game(player, debug=debug), player)
	return out

@app.route('/info/<faction>')
def get_info(faction):
	return FORMAT_MSG(get_game_info(faction))

@app.route('/status/<faction>')
def get_status(faction):
	out = FORMAT_MSG(pull_msg(faction), faction)
	return out

# action values are delimited by "+"
@app.route('/action/<faction>/<action:vals>')
def take_action(faction, vals):
	
	out = FORMAT_MSG(step(faction, vals), faction)
	return out

if __name__ == "__main__":
	app.run(host='localhost',port=5000)
