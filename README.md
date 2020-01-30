# BioFun

    TODO Gif / Video

A two player, online, turn based game that was eventually going to be themed around cells and biology related material.

## Game Concept
1. A map is created with points randomly distributed.
2. Each player chooses a starting tile to build their base from, within their side of the map.
3. Both players ready up and game begins
  * Each player is given points throughout time, and if their are nearby points on the map that they click to mine
  * Players use their points to build:


* #### Structure
A cheap node that allows other nodes to be built off it. If this node is upgraded once, nodes can be built diagonally and it adds a layer of defense from enemy attacks.

* #### Offense
Player can click adjacent enemy tiles to destroy their segments for a price. Destroying one segment also cuts off the rest like a branch cut from a tree.

* #### Point Generator
This generates points over time. Invest now for higher returns later.

      TODO Ew, fix this section

## What Happened to the Project?
Work began on September 18, 2015, and ended on October 25, 2015. 37 days total. The front-end is functionally completed as the Javascript is all there, all that was left was a UI overhaul with some CSS magic.

I didn't have a job at the time so I didn't think that learning how to host the game on a server would be an efficient use of time as I couldn't afford any of the website hosting, domain, and backend server costs.

Thus the game was left in its current state...

## How I Made It
I implemented a basic Node.js server on my localhost to run multiple 2 player games at once, each game and player with a separate ID.
The front end is 1/4th cup plain HTML, a pinch of CSS, and 2 heaping scoops of Javascript.
*(The server did the game state/score calculations, but the client still required a lot just to display the information)*

    TODO Go through code and see what I did

## What I Learned
I'm glad that I started learning how to program with Javascript and Node.js. Before this I had only used Unity's C# / Javascript, which some would argue are not valid because of how much Unity does under the hood.

Implementing a server was not as difficult as I thought thanks to Node.js. I was able to learn a lot about html and javascript through this as well. The first version [Javascript Grid](Versions.1_Javascript_Grid.md) was the first HTML website I made that wasn't some hello world or print out mouse positions.

    TODO Go through code and see what I did right/wrong

## Future Implementation
One day I hope to see what I can scrape from this old project and get it running again, when I do I will link it here and this whole readme will be changed too.
