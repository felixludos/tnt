

from multiprocessing.managers import BaseManager
import queue
back_to_front = queue.Queue()
front_to_back = queue.Queue()
class QueueManager(BaseManager): pass
QueueManager.register('get_btf', callable=lambda:back_to_front)
QueueManager.register('get_ftb', callable=lambda:front_to_back)
m = QueueManager(address=('', 50000), authkey=b'a')
s = m.get_server()
print('Running')

s.serve_forever()