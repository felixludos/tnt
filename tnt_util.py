import sys, os, time
import numpy as np
#import matplotlib.pyplot as plt
import yaml
import networkx as nx
import uuid
from IPython.display import display_javascript, display_html
from structures import tdict, tlist, tset, adict, idict, xset, get_object, get_table, pull_ID, register_obj, Transactionable
from itertools import product, chain

class DigitalLog(object):
	def __init__(self):
		self.collection = []
	def write(self, obj):
		self.collection.append(obj)
	def pull(self):
		s = ''.join(self.collection)
		self.collection.clear()
		return s
	def close(self):
		self.collection.clear()

class Logger(Transactionable):
	def __init__(self, *logfiles, stdout=False):
		self.stdout = sys.stdout if stdout else None
		self.logfiles = logfiles
		self.collector = None
		
		self.backup = sys.stdout
		sys.stdout = self
	
	def begin(self):
		if self.in_transaction():
			self.abort()
		self.collector = []
	
	def in_transaction(self):
		return self.collector is not None
	
	def commit(self):
		if not self.in_transaction():
			return
		objs = self.collector
		self.collector = None
		for obj in objs:
			self.write(obj)
		self.flush()
	
	def abort(self):
		if not self.in_transaction():
			return
		self.collector = None
	
	def write(self, obj):
		if self.in_transaction():
			return self.collector.append(obj)
		for logfile in self.logfiles:
			logfile.write(obj)
		if self.stdout is not None:
			self.stdout.write(obj)
	
	def flush(self):
		if self.stdout is not None:
			self.stdout.flush()
	
	def __del__(self):
		sys.stdout = self.backup
		print('Killing logger')
		for logfile in self.logfiles:
			logfile.close()


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
			itr['l_{}'.format(i)] = render_format(el)
		return itr
	elif isinstance(raw, set):
		itr = dict()
		for i, el in enumerate(raw):
			itr['s_{}'.format(i)] = render_format(el)
		return itr
	elif isinstance(raw, tuple):
		itr = dict()
		for i, el in enumerate(raw):
			itr['t_{}'.format(i)] = render_format(el)
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












