from collections import deque
import torch.multiprocessing as mp
#from torch.multiprocessing import BaseManager
from multiprocessing.managers import BaseManager
class QueueManager(BaseManager): pass
QueueManager.register('get_btf')
QueueManager.register('get_ftb')

class GameStateError(Exception):  # no recovery
	def __init__(self, message):
		super().__init__(message)


class ActionError(Exception):  # Revert single action
	def __init__(self, message, errors):
		super().__init__(message)
		
		self.errors = errors
		

class Manager(object):
	def __init__(self, inbox, outbox):
		self.inbox = inbox
		self.outbox = outbox
	
	def checkpoint(self, action_fn, state):
		
		
		
		try:
			action_fn(state, self.inbox, self.outbox)
		except ActionError as e:
			pass
		
class TestManager(Manager):
	def __init__(self, host='localhost', port=50000, key=b'a'):
		m = QueueManager(address=(host, port), authkey=key)
		m.connect()
		
		inbox = m.get_ftb()
		outbox = m.get_btf()
		
		super().__init__(inbox, outbox)






