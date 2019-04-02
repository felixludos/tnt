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

def hide_objects(objects, player=None):
	if player is None:
		return objects
	
	for obj in objects.values():
		if player not in obj['visible']['set']:
			for k in obj.keys():
				if k not in {'visible', 'obj_type'}:
					del obj[k]

def format_flask_msg(msg, player=None):
	
	msg = convert_jsonable(msg)
	
	hide_objects(msg['created'], player=player)
	hide_objects(msg['updated'], player=player)
	hide_objects(msg['removed'], player=player)
	
	msg = json.dumps(msg)
	
	return msg

FORMAT_MSG = format_flask_msg

@app.route("/")
def ping():
	return 'Backend active: use "init" to init game'

@app.route('/init/<game_type>/<player>')
def init_game(game_type='hotseat', player='Axis', debug=False):
	
	if debug:
		global FORMAT_MSG
		FORMAT_MSG = lambda x: x
	
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