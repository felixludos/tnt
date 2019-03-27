

def condensed_str(x): # for printing dicts
	if isinstance(x, adict):
		s = []
		for k in x.keys():
			if isinstance(k, dict):
				s.append('{...}')
			elif isinstance(k, list):
				s.append('[...]')
			else:
				s.append(str(k))
		return '{}({})'.format(type(x), ', '.join(s))
	elif isinstance(x, list):
		s = []
		for k in x:
			if isinstance(k, dict):
				s.append('{...}')
			elif isinstance(k, list):
				s.append('[...]')
			else:
				s.append(str(k))
		return '[{}]'.format(', '.join(s))
	return str(x)

# adict - dicts allowing access through attributes
class adict(dict):
	def __getattr__(self, key):
		return super().__getitem__(key)
	def __setattr__(self, key, value):
		return super().__setitem__(key, value)
	# def __missing__(self, key):
	#     return None
	def __iter__(self):
		return iter(self.keys())
	def __delattr__(self, item):
		return super().__delitem__(item)
	def __getstate__(self):
		return super().__getstate__()
	def copy(self):
		return adict(self.items())
	def __str__(self):
		items = []
		for k,v in self.items():
			items.append( '{}:{}'.format(str(k), condensed_str(v)) )
		return 'adict({})'.format(', '.join(items))
	def __repr__(self):
		return '{'+', '.join('{}:{}'.format(repr(k),repr(v)) for k,v in self.items())+'}'


# idict - dicts with ID (copy creates new id)

_object_table = dict()
def get_table():
	return _object_table
def get_object(ID):
	return _object_table[ID]



class idict_keysiterator(object):
	def __init__(self, itr):
		self._itr = itr
	def __iter__(self):
		return self
	def __next__(self):
		k = next(self._itr)
		if k == '_id':
			return next(self._itr)
		return k
class idict_keys(object):
	def __init__(self, view):
		self._view = view
	def __iter__(self):
		return idict_keysiterator(iter(self._view))
	def __repr__(self):
		return 'xdict_keys({})'.format(', '.join(repr(k) for k in iter(self)))

class idict_itemsiterator(object):
	def __init__(self, itr):
		self._itr = itr
	def __iter__(self):
		return self
	def __next__(self):
		i = next(self._itr)
		if i[0] == '_id':
			return next(self._itr)
		return i
class idict_items(object):
	def __init__(self, view):
		self._view = view
	def __iter__(self):
		return idict_itemsiterator(iter(self._view))
	def __repr__(self):
		return 'xdict_items({})'.format(', '.join('{}:{}'.format(repr(k),repr(v)) for k,v in iter(self)))

class idict_valuesiterator(object):
	def __init__(self, itr):
		self._itr = itr
	def __iter__(self):
		return self
	def __next__(self):
		k, v = next(self._itr)
		if k == '_id':
			return next(self._itr)[1]
		return v
class idict_values(object):
	def __init__(self, view):
		self._view = view
	def __iter__(self):
		return idict_valuesiterator(iter(self._view))
	def __repr__(self):
		return 'xdict_values({})'.format(', '.join(repr(v) for v in iter(self)))

_dict_ID = 0
class idict(adict):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		global _dict_ID
		self._id = _dict_ID
		_object_table[self._id] = self
		_dict_ID += 1
	def __eq__(self, other):
		return self._id == other._id
	def __hash__(self):
		return self._id
	def __len__(self):
		return max(0, super().__len__()-1)
	def __del__(self):
		del _object_table[self._id]
	def __getstate__(self):
		return super().__getstate__()
	def copy(self):
		return idict(self.items())
	def keys(self):
		return idict_keys(super().keys())
	def values(self):
		return idict_values(super().items())
	def items(self):
		return idict_items(super().items())
	def full_items(self):
		return super().items()
	def to_dict(self, with_id=True):
		if with_id:
			return dict(self.full_items())
		return dict(self.items())
	def __str__(self):
		items = []
		for k,v in self.items():
			items.append( '{}:{}'.format(str(k), condensed_str(v)) )
		return 'idict({})'.format(', '.join(items))
	def __repr__(self):
		return '{'+', '.join('{}:{}'.format(repr(k),repr(v)) for k,v in self.items())+'}'

_set_ID = 0
class xset(set):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		global _set_ID
		self._id = _set_ID
		_set_ID += 1
	def __eq__(self, other):
		return self._id == other._id
	def __hash__(self):
		return self._id

