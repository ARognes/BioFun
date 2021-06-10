

#Client
  emit
    new user
    find game
    ready

  on
    game found
      game found echo
    player left
    ready accepted
    start game
    grid
    error

#Server
  new user
  find game
    game found
  game found echo
  ready