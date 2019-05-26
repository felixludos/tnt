
import sys, os, time
import random


_global_id = 0

_primitives = (str, int, float, bool)

class UnknownObject(Exception):
	pass

class Container(object):
	
	def __setattr__(self, key, item):
		if isinstance(item, Container):
			super().__setattr__(key, item)
		elif isinstance(item, _primitives):
			super().__setattr__(key, item)
		raise UnknownObject(key, item)
	
	def __setstate__(self, state):
		
		for key, value in state.items():
			if isinstance(value, dict) and '_type' in value:
				info = value
				value = eval(info['_type'] + '()')
				del info['_type']
				value.__setstate__(info)
			self.__dict__[key] = value
	
	def __getstate__(self):
		state = {}
		for key, value in self.__dict__.items():
			if isinstance(value, Container):
				info = value.__getstate__()
				info['_type'] = str(type(value).__name__)
			else:
				state[key] = value
		return state
	
	def copy(self):
		copy = type(self)()
		copy.__setstate__(self.__getstate__())
		return copy

class GameObject(object):
	
	def __init__(self, name=None, obj_type=None):
		self.name = name
		self.obj_type = obj_type
		
		global _global_id
		self._id = _global_id
		_global_id += 1
	
	def
	
	def state_dict(self):
		pass
	
	def load_state_dict(self):
		pass
	
	def __str__(self):
		return self.name



