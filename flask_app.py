from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
from flask_util import ActionConverter
import json
app = Flask(__name__, static_folder='static')
CORS(app)

app.url_map.converters['action'] = ActionConverter

from passive_backend import *

def convert_jsonable(msg):
	
	if isinstance(msg, dict):
		return {convert_jsonable(k):convert_jsonable(v) for k,v in msg.items()}
	if isinstance(msg, (list, tuple)):
		return [convert_jsonable(el) for el in msg]
	if isinstance(msg, set):
		return {'set':[convert_jsonable(el) for el in msg]}
	# if not isinstance(msg, str):
	# 	return str(msg)
	return msg

def deepcopy_message(msg):
	if isinstance(msg, (tdict, adict)):
		return adict({deepcopy_message(k):deepcopy_message(v) for k,v in msg.items()})
	if isinstance(msg, idict):
		copy = msg.copy()
		copy._id = msg._id
		return copy
	if isinstance(msg, (list, tuple)):
		return type(msg)(deepcopy_message(el) for el in msg)
	if isinstance(msg, set):
		return xset(deepcopy_message(el) for el in msg)
	# if not isinstance(msg, str):
	# 	return str(msg)
	return msg

def hide_objects(objects, player=None, cond=None):
	if cond is None:
		cond = lambda obj, player: player not in obj.visible
	if player is None:
		return objects
	
	for obj in objects.values():
		if cond(obj, player):
			for k in list(obj.keys()):
				if k in obj and k not in {'visible', 'obj_type'}:
					del obj[k]

def format_flask_msg(msg, player=None):
	
	msg = convert_jsonable(msg)
	
	cond = lambda obj, player: player not in obj['visible']['set']
	
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
		return adict({unjsonify(k):unjsonify(v) for k,v in msg.items()})
	if isinstance(msg, list):
		return tuple(unjsonify(el) for el in msg)
	# if not isinstance(msg, str):
	# 	return str(msg)
	return msg

def format_output(msg):
	msg = unjsonify(json.loads(msg))
	
	return msg

FORMAT_MSG = format_flask_msg

@app.route("/")
def ping():
	return 'Backend active: use "init" to init game'

@app.route('/init/<game_type>/<player>')
def init_game(game_type='hotseat', player='Axis', debug=False):
	
	# if debug:
	# 	global FORMAT_MSG
	# 	FORMAT_MSG = format_debug_msg
	
	if not game_type == 'hotseat':
		return 'Error: Game type must be hotseat'
	return FORMAT_MSG(start_new_game(player, debug=debug))

@app.route('/info/<faction>')
def get_info(faction):
	return 'Error: NOT IMPLEMENTED: Will send info about {}'.format(faction)

@app.route('/status/<faction>')
def get_status(faction):
	return FORMAT_MSG(get_waiting(faction))

@app.route('/action/<faction>/<action:vals>') # action values are delimited by "+"
def take_action(faction, vals):
	
	return FORMAT_MSG(step(faction, vals))
	
	return 'Received action from {}: {}'.format(faction, str(vals))

#das brauch ich um es local laufen zu lassen
if __name__ == "__main__":
	app.run()