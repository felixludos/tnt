from IPython import embed
from multiprocessing.managers import BaseManager
from tnt_errors import TestManager
from util import xdict

io = TestManager(reverse=True)
print('Connected')

# do something before repl

print('Testing setup phase')

setup = xdict()

for _ in range(3):
	msg = io.get()
	setup[msg.player] = msg.info



embed()