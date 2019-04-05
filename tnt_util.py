import sys, os, time
import numpy as np
#import matplotlib.pyplot as plt
import yaml
import networkx as nx
import uuid
from IPython.display import display_javascript, display_html
from structures import tdict, tlist, tset, adict, idict, xset, get_object, get_table, pull_ID, register_obj, Transactionable
from itertools import product, chain
from collections import deque

######################
# Game Processing
######################

def compute_tracks(territory, tiles):
	pop, res = 0, 0
	for name, tile in tiles.items():
		if name in territory and 'blockaded' not in tile:
			pop += tile['pop']
			res += tile['res']
			if 'res_afr' in tile and 'blockaded_afr' not in tile:
				res += tile['res_afr']
	return pop, res


def compute_production_level(G, player):
	faction = G.players[player]
	at_war = sum(faction.stats.at_war.values())
	
	if at_war:
		return min(G.tracks.pop, G.tracks.res, G.tracks.ind)
	return min(G.tracks.pop, G.tracks.ind)


def count_victory_points(G):
	points = adict({p: 0 for p in G.players})
	
	for name, faction in G.players.items():
		
		# current production level
		prod_level = compute_production_level(G, name)
		points[name] += prod_level
		
		# control of enemy capitals
		enemy_cities = 0
		for rival, rival_faction in G.players.items():
			if rival != name:
				if rival_faction.cities.MainCapital in faction.territory:
					enemy_cities += 1
				for subcapital in rival_faction.cities.SubCapitals:
					if subcapital in faction.territory:
						enemy_cities += 1
		
		points[name] += 2 * enemy_cities
		
		# count atomic research
		atomics = 0
		for tech in faction.technologies:
			if 'Atomic' in tech:
				atomics += 1
		points[name] += 1 * atomics
		
		# peace dividends
		points[name] += sum(faction.stats.peace_dividends)
		
		# subtract DoW
		DoWs = sum(faction.stats.DoW.values())
		points[name] -= DoWs
	
	return points

######################
# Log
######################

class Logger(Transactionable):
	def __init__(self, *players, stdout=False):
		self.stdout = stdout
		self.logs = adict({p:deque() for p in players})
		self.updates = adict({p:deque() for p in players})
		self.collector = None
		
		self.backup = sys.stdout
		sys.stdout = self
	
	def begin(self):
		if self.in_transaction():
			self.abort()
		self.updates = []
	
	def in_transaction(self):
		return self.collector is not None
	
	def commit(self):
		if not self.in_transaction():
			return
		objs = self.collector
		self.collector = None
		for obj in objs:
			self.write(obj)
	
	def abort(self):
		if not self.in_transaction():
			return
		self.collector = None
	
	def write(self, obj, end='\n', player=None):
		obj += end
		if self.in_transaction():
			return self.collector.append(obj)
		self.update(obj, player=player)
		if self.stdout:
			print(obj, end='')
	
	def update(self, obj, player=None):
		
		if player is not None:
			self.updates[player].append(obj)
			self.logs[player].append(obj)
			return
		for update, log in zip(self.updates.values(), self.logs.values()):
			update.append(obj)
			log.append(obj)
	
	def pull(self, player):
		log = ''.join(self.updates[player])
		self.updates[player].clear()
		return log
	
	def get_full(self, player=None):
		if player is not None:
			return ''.join(self.logs[player])
		return adict({p:''.join(self.logs[p]) for p in self.logs})
	
	def __del__(self):
		sys.stdout = self.backup
		print('Killing logger')
		for logfile in self.logfiles:
			logfile.close()

######################
# misc
######################

def seq_iterate(content, *itrs): # None will return that value for each
	if len(itrs) == 0: # base case - iterate over content
		try:
			yield from content
		except TypeError:
			yield content
	else: # return only those samples that match specified (non None) tuples
		
		i, *itrs = itrs
		
		if isinstance(content, (list, tuple, set)):
			
			if i is None:
				for x in content:
					yield from seq_iterate(x, *itrs)
			elif isinstance(i, int) and i < len(content):
				yield from seq_iterate(content[i], *itrs)
		
		elif isinstance(content, dict):
			
			if i is None:
				for k, v in content.items():  # expand with id
					for rest in seq_iterate(v, *itrs):
						if isinstance(rest, tuple):
							yield (k,) + rest
						else:
							yield k, rest
			elif i in content:
				yield from seq_iterate(content[i], *itrs)


def expand_actions(code):
	if isinstance(code, set) and len(code) == 1:
		return expand_actions(next(iter(code)))
	
	if isinstance(code, str) or isinstance(code, int):
		return [code]
	
	# tuple case
	if isinstance(code, (tuple, list)):
		return list(product(*map(expand_actions, code)))
	if isinstance(code, set):
		return chain(*map(expand_actions, code))
	return code

def flatten(bla):
	output = ()
	for item in bla:
		output += flatten(item) if isinstance(item, (tuple, list)) else (item,)
	return output

def decode_actions(code):
	code = expand_actions(code)
	return xset(map(flatten, code))




def collate(raw, remove_space=True, transactionable=True):
	dicttype, settype, listtype = adict, xset, list
	if transactionable:
		dicttype, settype, listtype = tdict, tset, tlist
	if isinstance(raw, dict):
		return dicttype((collate(k, remove_space=remove_space, transactionable=transactionable),
		                  collate(v, remove_space=remove_space, transactionable=transactionable))
		                 for k,v in raw.items())
	elif isinstance(raw, list):
		return listtype(collate(x, remove_space=remove_space, transactionable=transactionable)
		                for x in raw)
	elif isinstance(raw, tuple):
		return (collate(x, remove_space=remove_space, transactionable=transactionable)
		        for x in raw)
	elif isinstance(raw, set):
		return settype(collate(x, remove_space=remove_space, transactionable=transactionable)
		            for x in raw)
	elif isinstance(raw, str) and remove_space:
		return raw.replace(' ', '_')
	return raw

def uncollate(raw, with_id=True):
	if isinstance(raw, dict):
		if isinstance(raw, idict) and with_id:
			return dict((uncollate(k,with_id),uncollate(v,with_id))
						for k,v in raw.to_dict(with_id).items())
		return dict((uncollate(k,with_id),uncollate(v,with_id))
					for k,v in raw.items())
	elif isinstance(raw, list):
		return [uncollate(x,with_id) for x in raw]
	elif isinstance(raw, tuple):
		return (uncollate(x,with_id) for x in raw)
	elif isinstance(raw, set) and type(raw) != xset:
		return set(uncollate(x,with_id) for x in raw)
	# elif isinstance(raw, str):
	#     return raw.replace('_', ' ')
	return raw




def save(data, path):
	yaml.dump(uncollate(data), open(path,'w'),
			  default_flow_style=False)

def load(path):
	return collate(yaml.load(open(path, 'r')))




def render_format(raw):
	if isinstance(raw, dict):
		return dict((str(k),render_format(v)) for k,v in raw.items())
	elif isinstance(raw, list):
		itr = dict()
		for i, el in enumerate(raw):
			itr['l{}'.format(i)] = render_format(el)
		return itr
	elif isinstance(raw, set):
		itr = dict()
		for i, el in enumerate(raw):
			itr['s{}'.format(i)] = render_format(el)
		return itr
	elif isinstance(raw, tuple):
		itr = dict()
		for i, el in enumerate(raw):
			itr['t{}'.format(i)] = render_format(el)
		return itr
	return str(raw)

class render_dict(object):
	def __init__(self, json_data):
	
		self.json_str = render_format( json_data )
		
		# if isinstance(json_data, dict):
		#     self.json_str = json_data
		#     #self.json_str = json.dumps(json_data)
		# else:
		#     self.json_str = json
		self.uuid = str(uuid.uuid4())

	def _ipython_display_(self):
		display_html('<div id="{}" style="height: 600px; width:100%;"></div>'.format(self.uuid),
			raw=True
		)
		display_javascript("""
		require(["https://rawgit.com/caldwell/renderjson/master/renderjson.js"], function() {
		  renderjson.set_show_to_level(1)
		  document.getElementById('%s').appendChild(renderjson(%s))
		});
		""" % (self.uuid, self.json_str), raw=True)












