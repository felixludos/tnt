

from multiprocessing.managers import BaseManager
import queue

class VocalQueue(queue.Queue):
	def __init__(self, name):
		super().__init__()
		self.name = name
		print('{} ready'.format(self.name))
	def put(self, x, *args, **kwargs):
		print('{}.put: {}'.format(self.name, str(x)[:50]))
		super().put(x, *args, **kwargs)
	def get(self, *args, **kwargs):
		x = super().get(*args, **kwargs)
		print('{}.get: {}'.format(self.name, str(x)[:50]))
		return x


back_to_front = queue.Queue()
front_to_back = queue.Queue()

back_to_front = VocalQueue('btf')
front_to_back = VocalQueue('ftb')

class QueueManager(BaseManager): pass
QueueManager.register('get_btf', callable=lambda:back_to_front)
QueueManager.register('get_ftb', callable=lambda:front_to_back)
m = QueueManager(address=('', 50000), authkey=b'a')
s = m.get_server()
print('Running')

s.serve_forever()