
from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete
from tnt_cards import discard_cards
from tnt_units import add_unit, move_unit
from tnt_util import travel_options, eval_tile_control, present_powers
from government import check_revealable, reveal_tech


def combat_phase(G, player, action):
	raise NotImplementedError


def retreat_phase(G, player, action):
	
	if action is None:
		pass
	
	raise NotImplementedError

