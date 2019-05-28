


class Land_Battle_Phase(GamePhase):
	
	def encode(self, G):
		raise NotImplementedError
	
	def execute(self, G, player=None, action=None):
		raise NotImplementedError


class Sea_Battle_Phase(GamePhase):
	
	def encode(self, G):
		raise NotImplementedError
	
	def execute(self, G, player=None, action=None):
		raise NotImplementedError


class Battle_Resolution_Phase(GamePhase): # including rebasing
	
	def encode(self, G):
		raise NotImplementedError
	
	def execute(self, G, player=None, action=None):
		raise NotImplementedError
