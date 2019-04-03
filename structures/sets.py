

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
	def __repr__(self):
		return '{'+', '.join(map(repr,iter(self)))+'}'
	def __str__(self):
		return '{'+', '.join(map(repr,iter(self)))+'}'
