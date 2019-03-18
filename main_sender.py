from IPython import embed
from multiprocessing.managers import BaseManager

class QueueManager(BaseManager): pass
QueueManager.register('get_btf')
QueueManager.register('get_ftb')
m = QueueManager(address=('localhost', 50000), authkey=b'a')
m.connect()
print('Connected')
inbox = m.get_btf()
outbox = m.get_ftb()

embed()