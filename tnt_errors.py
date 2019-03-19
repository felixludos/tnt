from collections import deque
from tnt_util import xdict, xset, load, save
#import torch.multiprocessing as mp
#from torch.multiprocessing import BaseManager
from multiprocessing.managers import BaseManager
class QueueManager(BaseManager): pass
QueueManager.register('get_btf')
QueueManager.register('get_ftb')

class GameStateError(Exception):  # no recovery
	def __init__(self, message):
		super().__init__(message)


class ActionError(Exception):  # Revert single action
	def __init__(self, message):
		super().__init__(message)
		

class Manager(object):
	def __init__(self, inbox, outbox, temp_path='temp.yml', max_trials=10):
		self.inbox = inbox
		self.outbox = outbox
		
		self.temp_path = temp_path
		self.max_trials = max_trials
	
	def checkpoint(self, phase, state, *args, **kwargs):
		
		save(state, self.temp_path)
		
		for _ in range(self.max_trials):
			try:
				phase(state, self.inbox, self.outbox, *args, **kwargs)
			except GameStateError as e:
				state = load(self.temp_path)
			else:
				break
		
class TestManager(Manager):
	def __init__(self, host='localhost', port=50000, key=b'a'):
		m = QueueManager(address=(host, port), authkey=key)
		m.connect()
		
		inbox = m.get_ftb()
		outbox = m.get_btf()
		
		super().__init__(inbox, outbox)






