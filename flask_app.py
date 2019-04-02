from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
from flask_util import ActionConverter
app = Flask(__name__, static_folder='static')
CORS(app)

app.url_map.converters['action'] = ActionConverter

from passive_backend import *

@app.route("/")
def ping():
	return 'Backend active: use "init" to init game'

@app.route('/init/<game_type>/<player>')
def init_game(game_type='hotseat', player='Axis'):
	if not game_type == 'hotseat':
		return 'Error: Game type must be hotseat'
	return start_new_game(player)
	# init game
	return 'Will send list of all game objects, including actions'

@app.route('/info/<faction>')
def get_info(faction):
	return 'Will send info about {}'.format(faction)

@app.route('/status/<faction>')
def get_status(faction):
	return get_waiting(faction)

@app.route('/action/<faction>/<action:vals>') # action values are delimited by "+"
def take_action(faction, vals):
	
	return step(faction, vals)
	
	return 'Received action from {}: {}'.format(faction, str(vals))

#das brauch ich um es local laufen zu lassen
if __name__ == "__main__":
	app.run()