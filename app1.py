from passive_backend import *
from tnt_edit import *
from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
from flask import request
from flask_util import ActionConverter
import json
app = Flask(__name__)  # , static_folder='_front/front_console')
CORS(app)

@app.route('/randint/<max>')
def randint(max):
	n = get_G().random.randint(0, int(max))
	print('random int:', n)
	return '{"int":"' + str(n) + '"}'

@app.route('/postTest', methods=['POST'])
def postTest():
	data = request.json
	with open("saves/test.json", 'w') as f:
		f.write(json.dumps(data))
	return 'done!'

@app.route('/loadTest')
def loadTest():
	load_gamestate('saves/setup_complete.json')
	return ('loaded saves/setup_complete.json')

@app.route('/savetest1')
def savetest1():
	return save_gamestate('test1.json')

@app.route('/mysave/<fname>')
def mysave(fname):
	save_gamestate(fname + '.json')
	return ('saved saves/' + fname + '.json')

@app.route('/loadtest1')
def loadtest1():
	load_gamestate('saves/test1.json')
	return ('loaded: saves/test1.json')

@app.route('/spring_start')
def spring_start():
	load_gamestate('saves/spring_start.json')
	return ('loaded saves/spring_start.json')

@app.route('/myload/<data>')
def myload(data):
	load_gamestate('saves/' + data)
	return ('loaded: saves/' + data)

statfold_sim = '_front/asimple'

@app.route('/sim')
@app.route('/sim/')
def rootsim():
	return send_from_directory(statfold_sim, 'index.html')

@app.route('/a/<path:path>')
def rootsimPath(path):
	return send_from_directory(statfold_sim, path)

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


_visible_attrs = {  # attributes seen by all players even if obj isn't visible to the player
    'unit': {'nationality', 'tile', },
    'card': {'owner'},
}

def hide_objects(objects, player=None, cond=None):
	if cond is None:

		def cond(obj, player):
			return player not in obj.visible

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

	def cond(obj, player):
		return player not in obj['visible']['set']

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

@app.route("/")
def ping():
	return 'Backend active: use "init" to init game'

@app.route('/save/<filename>')
def save1(filename='test1.json'):
	return save_gamestate(filename)

@app.route('/load/<data>')
def load1(data):
	return load_gamestate(data)

@app.route('/refresh/<player>')
def refresh(player):
	return FORMAT_MSG(get_object_table(), player)

@app.route('/reset/<player>')
def reset(player):
	return FORMAT_MSG(get_object_table(), player)

@app.route('/init/<game_type>/<player>/<seed>')
def init_game(game_type='hotseat', player='Axis', debug=False, seed=0):
	if not game_type == 'hotseat':
		return 'Error: Game type must be hotseat'
	out = FORMAT_MSG(start_new_game(player, debug=debug, seed=seed), player)
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
	print(vals)
	out = FORMAT_MSG(step(faction, vals), faction)
	return out

def format_msg_for_editor(msg, player=None):
	msg = convert_jsonable(msg)
	# def cond(obj, player):
	# 	return player not in obj['visible']['set']
	# if 'created' in msg:
	# 	hide_objects(msg['created'], player=player, cond=cond)
	# if 'updated' in msg:
	# 	hide_objects(msg['updated'], player=player, cond=cond)
	# if 'removed' in msg:
	# 	hide_objects(msg['removed'], player=player, cond=cond)
	msg = json.dumps(msg)
	return msg

@app.route('/edit/<faction>/<action:vals>')
def edit_action(faction, vals):
	print('EDIT step wird aufgerufen')
	print(vals)
	out = format_msg_for_editor(edit_step(faction, vals), faction)
	return out

if __name__ == "__main__":
	app.run(host='localhost', port=5000)
