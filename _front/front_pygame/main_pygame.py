import sys, os, time
import tnt_util as util
from tnt_util import adict, idict, tdict, xset #collate, load, render_dict, save, Logger, seq_iterate
from tnt_setup import init_gamestate, setup_phase
from tnt_cards import load_card_decks, draw_cards
from collections import namedtuple
import random
from itertools import chain, product
from tnt_units import load_unit_rules

import tnt_setup as setup

from flask_app import *

import pygame as pg
from _front.front_pygame.camera import Camera
from _front.front_pygame.pygame_settings import *


class PGame:
    def __init__(self):
        pg.init()

        self.width = WIN_WIDTH
        self.height = WIN_HEIGHT
        win_info = pg.display.Info()
        self.screen_width = win_info.current_w
        self.screen_height = win_info.current_h
        self.win = pg.display.set_mode((self.width, self.height), pg.RESIZABLE)

        self.clock = pg.time.Clock()
        pg.display.set_caption("Triumph and Tragedy")
        pg.mouse.set_visible(True)

        self.rect_list = []

        self.map_img = None
        self.map = None
        self.map_rect = None
        self.camera = None

        self.playing = False
        self.running = True
        self.load_data()

    def load_data(self):
        self.map_img = pg.image.load(os.path.join(*GAME_MAP_PATH)).convert()  # Load map
        self.map = self.map_img  # Reference map
        self.map_rect = self.map.get_rect()

    def new(self):
        # set background
        #self.map = pg.transform.scale(self.map_img, (self.width, self.height))
        self.map = self.map_img
        self.win.blit(self.map, self.map_rect)

        # set up camera
        self.camera = Camera(self, self.width, self.height)

        # Apply changes to the game window
        pg.display.update()
        self.run()

    def run(self):
        self.playing = True
        while self.playing:
            self.events()

    def events(self):
        # PROCESS INPUTS
        for event in pg.event.get():
            # check if the user closes the game
            if event.type == pg.QUIT:
                if self.playing:
                    self.playing = False
                self.running = False

            # Handle pausing
            if event.type == pg.KEYDOWN:
                if event.key == pg.K_ESCAPE:
                    self.pause()

            # Handle clicking, panning (later, w/ pygame 2), zooming
            mouse_pos = pg.mouse.get_pos()
            if event.type == pg.MOUSEBUTTONDOWN:
                if event.button == 1:  # Click
                    print(str(mouse_pos))
                if event.button == 4:  # Scroll Down (Zoom out)
                    print("Mouse wheel DOWN")
                    #self.camera.zoom_out(self.map)
                    self.map = pg.transform.scale(self.map_img, (self.map.get_width() - 5, self.map.get_height() - 5))
                    self.win.blit(self.map, self.map.get_rect())
                    pg.display.update()
                if event.button == 5:  # Scroll Up (Zoom in)
                    print("Mouse wheel UP")
                    #self.camera.zoom_in(self.map)
                    self.map = pg.transform.scale(self.map_img, (self.map.get_width() + 5, self.map.get_height() + 5))
                    self.win.blit(self.map, self.map.get_rect())
                    pg.display.update()

            # Handle panning
            if event.type == pg.KEYDOWN:
                if event.key == pg.K_LEFT:
                    # Pan left
                    self.map_rect.move_ip(SCROLL_SPEED, 0)
                    self.map_rect.clamp_ip(self.win.get_rect())
                    self.win.blit(self.map, self.map_rect)
                    pg.display.update()
                if event.key == pg.K_RIGHT:
                    # Pan right
                    self.map_rect.move_ip(-SCROLL_SPEED, 0)
                    self.map_rect.clamp_ip(self.win.get_rect())
                    self.win.blit(self.map, self.map_rect)
                    pg.display.update()
                if event.key == pg.K_UP:
                    # Pan up
                    self.map_rect.move_ip(0, SCROLL_SPEED)
                    self.win.blit(self.map, self.map_rect)
                    pg.display.update()
                if event.key == pg.K_DOWN:
                    # Pan down
                    self.map_rect.move_ip(0, -SCROLL_SPEED)
                    self.win.blit(self.map, self.map_rect)
                    pg.display.update()

            # Handle window resizing
            if event.type == pg.VIDEORESIZE:
                self.width = event.w
                self.height = event.h # Update the display properties

                old_content = self.win
                self.win = pg.display.set_mode((self.width, self.height), pg.RESIZABLE)
                self.win.blit(old_content, (0, 0))

                """self.map = pg.transform.scale(self.map_img, (self.width, self.height))
                self.win.blit(self.map, self.map.get_rect())
                print(self.width, self.height)"""

                self.camera.update_map(self.width, self.height) # Update the camera properties
                pg.display.update()
                del old_content

    def pause(self):
        pass


def main():
    p = PGame()

    print(ping())
    player = 'Axis'
    out = format_msg_to_python(init_game(debug=False, player=player))  # start Tnt from flask_app
    print(out)

    while p.running:
        p.new()


if __name__ == '__main__':
    main()
