

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
		return self.__getitem__(key)
	def __setattr__(self, key, value):
		return self.__setitem__(key, value)
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


_dict_ID = 0
class idict(adict): # WARNING: These objects are not garbage collected
	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		global _dict_ID
		self.__dict__['_id'] = _dict_ID
		_object_table[self._id] = self
		_dict_ID += 1
	def __getattr__(self, key):
		if key == '_id':
			return self.__dict__['_id']
		return super().__getattr__(key)
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
	def to_dict(self, with_id=True):
		if with_id:
			copy = dict(self.full_items())
			copy['_id'] = self._id
			return copy
		return dict(self.items())
	def __str__(self):
		items = []
		for k,v in self.items():
			items.append( '{}:{}'.format(str(k), condensed_str(v)) )
		return 'idict[{}]({})'.format(self._id, ', '.join(items))
	def __repr__(self):
		return '{'+', '.join('{}:{}'.format(repr(k),repr(v)) for k,v in self.items())+'}'

# comparable set

_set_ID = 0
class xset(set):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		global _set_ID
		self._id = _set_ID
		_set_ID += 1
	def copy(self): # Copies have new IDs (can't be compared to originals)
		return xset(iter(self))
	def __eq__(self, other):
		return self._id == other._id
	def __hash__(self):
		return self._id


# tdict - dicts allowing transactions (including nested tdicts)


class TransactionError(Exception):
	pass
class UnfinishedTransactionError(Exception):
	pass
class _DeleteItemFlag(object):
	pass


class tdict_keysiterator(object):
	def __init__(self, table, pending):
		self._togo = set(super(tdict, table).keys())
		if pending is not None:
			self._togo.update(super(adict, pending).keys())
		self._togo = iter(self._togo)
		self._table = table
		self._pending = pending
	def __iter__(self):
		return self
	def __next__(self):
		k = None
		while k is None:
			k = next(self._togo)
			if self._pending is not None and k in self._pending:
				if self._pending[k] is _DeleteItemFlag:
					k = None
				else:
					return k
		return k
class tdict_keys(object):
	def __init__(self, view, pending):
		self._view = view
		self._pending = pending
	def __iter__(self):
		return tdict_keysiterator(self._view, self._pending)
	def __repr__(self):
		return 'tdict_keys({})'.format(', '.join(repr(k) for k in iter(self)))

class tdict_itemsiterator(object):
	def __init__(self, table, pending):
		self._togo = set(super(tdict, table).keys())
		if pending is not None:
			self._togo.update(super(adict, pending).keys())
		self._togo = iter(self._togo)
		self._table = table
		self._pending = pending
	def __iter__(self):
		return self
	def __next__(self):
		k = None
		while k is None:
			k = next(self._togo)
			if self._pending is not None and k in self._pending:
				if self._pending[k] is _DeleteItemFlag:
					k = None
				else:
					return k, self._pending[k]
		return k, self._table[k]
class tdict_items(object):
	def __init__(self, view, pending):
		self._view = view
		self._pending = pending
	def __iter__(self):
		return tdict_itemsiterator(self._view, self._pending)
	def __repr__(self):
		return 'tdict_items({})'.format(', '.join('{}:{}'.format(repr(k),repr(v)) for k,v in iter(self)))

class tdict_valuesiterator(object):
	def __init__(self, table, pending):
		self._togo = set(super(tdict, table).keys())
		if pending is not None:
			self._togo.update(super(adict, pending).keys())
		self._togo = iter(self._togo)
		self._table = table
		self._pending = pending
	def __iter__(self):
		return self
	def __next__(self):
		k = None
		while k is None:
			k = next(self._togo)
			if self._pending is not None and k in self._pending:
				if self._pending[k] is _DeleteItemFlag:
					k = None
				else:
					return self._pending[k]
		return self._table[k]
class tdict_values(object):
	def __init__(self, view, pending):
		self._view = view
		self._pending = pending
	def __iter__(self):
		return tdict_valuesiterator(self._view, self._pending)
	def __repr__(self):
		return 'tdict_values({})'.format(', '.join(repr(v) for v in iter(self)))


class tdict(dict):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		self.__dict__['_transaction'] = None
	
	def __getattr__(self, key):
		try:
			return super().__getattr__(key)
		except:
			return self.__getitem__(key)
	
	def __setattr__(self, key, value):
		if key in self.__dict__:
			self.__dict__[key] = value
			return
		return self.__setitem__(key, value)
	
	def __delattr__(self, item):
		return self.__delitem__(item)
	
	def __contains__(self, key):
		if self._transaction is not None:
			return key not in self._transaction or self._transaction[key] != _DeleteItemFlag
		return super().__contains__(key)
	
	def __getitem__(self, key):
		if self._transaction is not None and key in self._transaction and self._transaction[key] != _DeleteItemFlag:
			return self._transaction[key]
		return super().__getitem__(key)
	
	def __setitem__(self, key, value):
		if self._transaction is not None:
			self._transaction[key] = value
			return
		super().__setitem__(key, value)
	
	def __delitem__(self, key): 
		if self._transaction is not None:
			if super().__contains__(key):
				self._transaction[key] = _DeleteItemFlag
				return
			del self._transaction[key]
			return
		super().__delitem__(key)
	
	def __iter__(self):
		return iter(self.keys())
	def keys(self):
		return tdict_keys(self, self._transaction)
	def values(self):
		return tdict_values(self, self._transaction)
	def items(self):
		return tdict_items(self, self._transaction)
	
	def __getstate__(self):
		return super().__getstate__()
	
	def copy(self):
		copy = tdict(self.items())
		if self._transaction is not None:
			copy._transaction = self._transaction.copy()
		return copy
	
	def __str__(self):
		items = []
		for k, v in self.items():
			items.append('{}:{}'.format(str(k), condensed_str(v)))
		return 'adict({})'.format(', '.join(items))
	
	def __repr__(self):
		return '{' + ', '.join('{}:{}'.format(repr(k), repr(v)) for k, v in self.items()) + '}'
	
	def begin(self):
		if self._transaction is not None:
			self.abort()  # automatically abort unfinished transaction
		# raise UnfinishedTransactionError('Commit or Abort current transaction before beginning a new one')
		
		self._transaction = adict()
		
		for v in self.values():
			if isinstance(v, tdict):
				v.begin()
	
	def commit(self):
		
		if self._transaction is None:
			return True
		
		for v in self.values():
			if isinstance(v, tdict):
				v.commit()
		
		changes = self._transaction
		self._transaction = None
		
		for k, v in changes.items():
			if v is _DeleteItemFlag:
				del self[k]
			else:
				self[k] = v
		
		return True
	
	def abort(self):
		
		if self._transaction is None:
			return True
		
		for v in self.values():
			if isinstance(v, tdict):
				v.abort()
		
		self._transaction = None
		
		return True
	
	def __enter__(self):
		self.begin()
	
	def __exit__(self, type, *args):
		if type is None:
			self.commit()
		else:
			self.abort()
