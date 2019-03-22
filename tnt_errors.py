from collections import deque
from tnt_util import xdict, xset, load, save, collate, uncollate
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
	def __init__(self, inbox, outbox, temp_path='temp.yml', max_trials=10, send_ids=True):
		self.inbox = inbox
		self.outbox = outbox
		
		self.temp_path = temp_path
		self.max_trials = max_trials
		self.send_ids = send_ids
		
	def empty(self):
		return self.inbox.empty()
		
	def put(self, msg):
		if isinstance(msg, xdict):
			msg = uncollate(msg, with_id=self.send_ids)
		self.outbox.put(str(msg))
		print('Sent message')
		
		# try:
		# 	self.outbox.put(dict(msg.full_items()))
		# except AttributeError:
		# 	self.outbox.put(msg)
			
	def get(self, wait=True):
		print('Waiting for message...', end='')
		if not wait and self.inbox.empty():
			return None
		msg = collate(eval(self.inbox.get()))
		print(' received')
		return msg
	
	def run(self, phase, state, checkpoint=False, **kwargs):
		
		if checkpoint:
			save(state, self.temp_path)
		
		for _ in range(self.max_trials):
			try:
				phase(state, self, **kwargs)
			except GameStateError as e:
				if checkpoint:
					state = load(self.temp_path)
			except Exception as e:
				print('Error in this phase!')
				raise e
			else:
				break
		
class TestManager(Manager):
	def __init__(self, reverse=False, send_ids=True, host='localhost', port=50000, key=b'a'):
		m = QueueManager(address=(host, port), authkey=key)
		m.connect()
		
		if reverse:
			inbox = m.get_btf()
			outbox = m.get_ftb()
		else:
			inbox = m.get_ftb()
			outbox = m.get_btf()
		
		super().__init__(inbox, outbox, send_ids=send_ids)






