var ge = {}; // grid engine namespace

ge.EntityTypes = {
    PLAYER: 'player',
    WALL: 'wall',
    BOMB: 'bomb'
};

ge.Directions = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right'
};

ge.Queue = class {
    constructor(capacity, dynamic=true) {
        this.capacity = capacity;
        this.dynamic = dynamic;
        this._innerArray = new Array(this.capacity).fill(null);
        this._head = 0;
        this._size = 0;
    }

    enqueue(item) {
        if (this.isFull()) {
            if (this.dynamic) {
                let orderedCopy = [];
                let newCapacity = this.capacity * 2;

                // Copy the original array out in order so that the head can be set to 0
                for (let i = this._head; i < this._head + this._size; i++) {
                    orderedCopy.push(this._innerArray[this._getIndex(i)]);
                }

                // Add nulls to increase array size to the new capacity for indexing purposes
                for (let i = this.capacity; i < newCapacity; i++) {
                    orderedCopy.push(null);
                }

                // Increase the capacity (the size can stay the same because nothing has been added)
                this.capacity = newCapacity;

                // Reset the head to 0
                this._head = 0;

                // Set the inner array to the new, larger array
                this._innerArray = orderedCopy;
            } else {
                throw "Static circular array within Queue ran out of space!";
            }
        }

        // Enqueue at the tail.
        this._innerArray[this.getTail()] = item;
        this._size += 1;
    }

    dequeue() {
        if (this.isEmpty()) {
            throw "Can't dequeue from an empty queue!";
        }

        // Dequeue from the head.
        let item = this._innerArray[this.getHead()];
        this._innerArray[this.getHead()] = null;
        this._head += 1;
        this._size -=1;

        return item;
    }

    isEmpty() {
        return this._size === 0;
    }

    isFull() {
        return this._size === this.capacity;
    }

    getHead() {
        return this._getIndex(this._head);
    }

    getTail() {
        return this._getIndex(this._head + this._size);
    }

    getSize() {
        return this._size;
    }

    _getIndex(circularIndex) {
        // This trick is required to deal with weird stuff JS's modulo operator does
        // that will result in it sometimes giving a negative answer.
        // Thanks to https://stackoverflow.com/a/54427125.
        return (circularIndex % this.capacity + this.capacity) % this.capacity;
    }
};

ge.Set = class {  // Basic set based on an Object. Does not handle collisions - hash function must result in no collisions.
    constructor() {
        this.data = {}
    }

    add(item) {
        if (typeof item.hash != 'function') {
            throw typeof item + ' must define a hash function to be added to a set.';
        }

        this.data[item.hash()] = true;
    }

    remove(item) {
        if (typeof item.hash != 'function') {
            throw typeof item + ' must define a hash function to be removed from a set.';
        }

        this.data[item.hash()] = undefined;
    }

    contains(item) {
        if (typeof item.hash != 'function') {
            throw typeof item + ' must define a hash function to be found in a set.'
        }

        return this.data.hasOwnProperty(item.hash());
    }
}

ge.Entity = class {
    constructor(type, direction=ge.Directions.DOWN) {
        this.type = type;
        this.direction = direction;
    }
};

ge.Wall = class extends ge.Entity {
    constructor(direction=ge.Directions.DOWN) {
        super(ge.EntityTypes.WALL, direction);
    }
};

ge.Player = class extends ge.Entity {
    constructor(id, position, direction=ge.Directions.DOWN) {
        super(ge.EntityTypes.PLAYER, direction);

        this.id = id;
        this.position = position;
        this.dead = false;
    }

    die() {
        this.dead = true;
    }

    hash() {
        return this.id;
    }
};

ge.Bomb = class extends ge.Entity {
    constructor(position, timer, callback, direction) {
        super(ge.EntityTypes.BOMB);

        this.direction = direction;
        this.position = position;
        this.timer = timer;
        this._callback = callback;
        this._timeoutId = setTimeout(() => { this._callback(this.position, this.direction); }, timer);
    }
};

ge.Point = class {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    above() {
        return new ge.Point(this.x, this.y - 1);
    }

    below() {
        return new ge.Point(this.x, this.y + 1);
    }

    left() {
        return new ge.Point(this.x - 1, this.y);
    }

    right() {
        return new ge.Point(this.x + 1, this.y);
    }

    hash() {
        return this.x.toString(10) + this.y.toString(10);
    }
};

ge.Tile = class {
    constructor(occupant=null) {
        this.occupant = occupant;
    }

    isEmpty() {
        return this.occupant === null;
    }

    fill(newOccupant) {
        if (this.isEmpty()) {
            this.occupant = newOccupant;
            return;
        }

        throw "Could not fill tile: The tile was already occupied by " + this.occupant;
    }

    clear() {
        this.occupant = null;
    }
};

ge.Grid = class {
    constructor(size) {
        this.size = size;
        this.contents = this._constructContents();
    }

    asText() {
        let str = "";

        for (let i = 0; i < this.size; i++) {
            str = str + i.toString().padStart(2, '0');

            for (let j = 0; j < this.size; j++) {
                let entity = this.contents[i][j].occupant;

                if (entity == null) {
                    str = str + '.';
                } else {
                    switch (entity.type) {
                        case ge.EntityTypes.BOMB:
                            str = str + "B";
                            break;
                        case ge.EntityTypes.PLAYER:
                            str = str + "P";
                            break;
                        case ge.EntityTypes.WALL:
                            str = str + "W";
                            break;
                        default:
                            str = str + "X";
                    }
                }
            }

            str = str + "\n";
        }

        return str;
    }

    getTileAtPos(point) {
        if (point.y < 0 || point.y >= this.size || point.x < 0 || point.x >= this.size) {
            throw 'There is no tile at (' + point.x + ', ' + point.y + ')!';
        }

        return this.contents[point.y][point.x];
    }

    getTileAbovePos(point) {
        if (point.y == 0) {
            throw 'There is no tile above (' + point.x + ', ' + point.y + ')!';
        }

        if (point.y < 0) {
            throw 'Y is out of bounds! No negative y-values are allowed! (' + point.x + ', ' + point.y + ')';
        }

        return this.getTileAtPos(point.above());
    }

    getTileBelowPos(point) {
        if (point.y == this.size - 1) {
            throw 'There is no tile below (' + point.x + ', ' + point.y + ')!';
        }

        if (point.y >= this.size) {
            throw 'Y is out of bounds! (' + point.x + ', ' + point.y + ')';
        }

        return this.getTileAtPos(point.below());
    }

    getTileLeftOfPos(point) {
        if (point.x == 0) {
            throw 'There is no tile left of (' + point.x + ', ' + point.y + ')!';
        }

        if (point.x < 0) {
            throw 'X is out of bounds! No negative x-values are allowed! (' + point.x + ', ' + point.y + ')';
        }

        return this.getTileAtPos(point.left());
    }

    getTileRightOfPos(point) {
        if (point.x == this.size - 1) {
            throw 'There is no tile to the right of (' + point.x + ', ' + point.y + ')!';
        }

        if (point.x >= this.size) {
            throw 'X is out of bounds! (' + point.x + ', ' + point.y + ')';
        }

        return this.getTileAtPos(point.right());
    }

    isMotionPossible(startPoint, direction) {
        let possible = true;

        switch (direction) {
            case ge.Directions.UP:
                possible = this.getTileAbovePos(startPoint).isEmpty();
                break;
            case ge.Directions.DOWN:
                possible = this.getTileBelowPos(startPoint).isEmpty();
                break;
            case ge.Directions.LEFT:
                possible = this.getTileLeftOfPos(startPoint).isEmpty();
                break;
            case ge.Directions.RIGHT:
                possible = this.getTileRightOfPos(startPoint).isEmpty();
                break;
            default:
                throw direction + " is not a valid direction. Try Directions.UP, Directions.DOWN, Directions.LEFT, and Directions.RIGHT.";
        }

        return possible;
    }

    isTraversable(pointA, pointB) {  // Implements breadth-first search.
        let traversable = false;
        let queue = new ge.Queue(this.size * this.size);
        let discovered = new ge.Set();

        discovered.add(pointA);
        queue.enqueue(pointA);

        while (!queue.isEmpty()) {
            let currentNode = queue.dequeue()

            if (currentNode.x === pointB.x && currentNode.y === pointB.y) {
                return true;
            }

            let adjacent = [currentNode.above(), currentNode.below(), currentNode.left(), currentNode.right()];

            for (let i = 0; i < adjacent.length; i++) {
                let point = adjacent[i];
                let tile = this.getTileAtPos(point);
                let clearPath = tile.isEmpty() || tile.occupant.type !== ge.EntityTypes.WALL;

                if (clearPath && !discovered.contains(point)) {
                    discovered.add(point);
                    queue.enqueue(point);
                }
            }
        }

        return false;
    }

    _constructContents() {
        let innerGrid = [];
        let sizeWithoutWalls = this.size - 2;

        // Add top wall
        innerGrid.push(this._makeHorizontalWall());

        // Add middle of grid
        for (let i = 0; i < sizeWithoutWalls; i++) {
            let row = [];

            // Left wall
            row.push(new ge.Tile(new ge.Wall()));

            for (let j = 0; j < sizeWithoutWalls; j++) {
                row.push(new ge.Tile());
            }

            // Right wall
            row.push(new ge.Tile(new ge.Wall()));

            innerGrid.push(row);
        }

        // Add bottom wall
        innerGrid.push(this._makeHorizontalWall());

        return innerGrid;
    }

    _makeHorizontalWall() {
        let horizontalWall = [];

        for (let i = 0; i < this.size; i++) {
            horizontalWall.push(new ge.Tile(new ge.Wall()));
        }

        return horizontalWall;
    }
};

ge.GameGridState = class {
    constructor(grid, players) {
        this.players = players;
        this._playersById = {};
        this.grid = grid;

        for (let i = 0; i < this.players.length; i++) {
            let player = this.players[i];

            this.grid.getTileAtPos(player.position).fill(player);
            this._playersById[player.id] = player;
        }
    }

    getPlayerById(playerId) {
        let player = this._playersById[playerId];

        if (player != null) {
            return player;
        }

        return null;
    }

    playerCanMove(playerId, direction) {
        let player = this.getPlayerById(playerId);

        if (player == null) {
            throw "Can't move player with id " + playerId + " because that player doesn't exist.";
        }

        return this.grid.isMotionPossible(player.position, direction);
    }

    movePlayer(playerId, point) {
        let player = this.getPlayerById(playerId);

        if (player == null) {
            throw "Can't move player with id " + playerId + " because that player doesn't exist.";
        }

        let oldPosition = player.position;
        let newPosition = point;

        let currentTile = this.grid.getTileAtPos(oldPosition);
        let nextTile = this.grid.getTileAtPos(newPosition);

        if (!nextTile.isEmpty()) {
            throw "Can't move player with id " + playerId + " to tile (" + newPosition.x + ", " + newPosition.y + ") because the tile at that position already has this in it: " + nextTile.occupant;
        }

        currentTile.clear();
        nextTile.fill(player);
        player.position = newPosition;
    }

    movePlayerInDirection(playerId, direction) {
        let player = this.getPlayerById(playerId);

        if (player == null) {
            throw "Can't move player with id " + playerId + " because that player doesn't exist.";
        }

        switch (direction) {
            case ge.Directions.UP:
                this.movePlayer(playerId, player.position.above());
                break;
            case ge.Directions.DOWN:
                this.movePlayer(playerId, player.position.below());
                break;
            case ge.Directions.LEFT:
                this.movePlayer(playerId, player.position.left());
                break;
            case ge.Directions.RIGHT:
                this.movePlayer(playerId, player.position.right());
                break;
            default:
                throw "Player could not me moved: " + direction + " is not a valid direction."
        }

        player.direction = direction;
    }

    killPlayer(playerId) {
        let player = this.getPlayerById(playerId);

        if (player === null) {
            throw "Can't kill player with id " + playerId + " because that player doesn't exist.";
        }

        player.die();  // Tell the player object that it is dead :(

        let playerTile = this.grid.getTileAtPos(player.position);  // Get the tile where the player is located.
        playerTile.clear();  // Remove the player object from the grid.
        playerTile.fill(new ge.Wall(player.direction)); // Fill the player's old location with a wall facing in the player's direction.
    }

    playerDropBomb(playerId, bombTimer=500) {
        let player = this.getPlayerById(playerId);

        if (player == null) {
            throw "Player with id " + playerId + " can't drop a bomb because that player doesn't exist.";
        }

        // Can we place a new bomb?
        // This works because a player can only drop a bomb into the space directly in front of them, i.e. the space that they would
        // move into if they moved one grid square in the direction that they were facing.
        if (this.grid.isMotionPossible(player.position, player.direction)) {
            let bombPosition;

            // Find the new position of the bomb.
            switch (player.direction) {
                case ge.Directions.UP:
                    bombPosition = player.position.above();
                    break;
                case ge.Directions.DOWN:
                    bombPosition = player.position.below();
                    break;
                case ge.Directions.LEFT:
                    bombPosition = player.position.left();
                    break;
                case ge.Directions.RIGHT:
                    bombPosition = player.position.right();
                    break;
                default:
                    throw player.direction + " is not a valid direction. Please check the player's direction."
            }

            console.log(this.grid.asText());

            // Place the bomb. The bomb's direction controls which direction it explodes in.
            // explosionCallback is called when the timer runs out.
            this.grid.getTileAtPos(bombPosition).fill(new ge.Bomb(bombPosition, bombTimer, this.explodeBomb.bind(this), player.direction));

            console.log(this.grid.asText());
        }
    }

    _reverseDirection(direction) {
        switch (direction) {
            case ge.Directions.UP:
                return ge.Directions.DOWN;
                break;
            case ge.Directions.DOWN:
                return ge.Directions.UP;
                break;
            case ge.Directions.LEFT:
                return ge.Directions.RIGHT;
                break;
            case ge.Directions.RIGHT:
                return ge.Directions.LEFT;
                break;
            default:
                throw "Direction couldn't be reversed: " + direction + " is not a valid direction."
        }
    }

    explodeBomb(position, direction) {  // Callback that a bomb calls to make itself go boom
        console.log(this.grid.asText());

        let bombTile = this.grid.getTileAtPos(position);
        bombTile.clear();  // Remove the bomb...

        // Create garbage in every direction except where the player who placed it is
        let directions = [ge.Directions.UP, ge.Directions.DOWN, ge.Directions.LEFT, ge.Directions.RIGHT];
        let explosionDirections = directions.filter(d => d != this._reverseDirection(direction));

        for (let i = 0; i < explosionDirections.length; i++) {
            let garbagePosition;
            let garbageDirection = explosionDirections[i];

            switch (garbageDirection) {
                case ge.Directions.UP:
                    garbagePosition = position.above();
                    break;
                case ge.Directions.DOWN:
                    garbagePosition = position.below();
                    break;
                case ge.Directions.LEFT:
                    garbagePosition = position.left();
                    break;
                case ge.Directions.RIGHT:
                    garbagePosition = position.right();
                    break;
            }

            let garbageTile = this.grid.getTileAtPos(garbagePosition);

            try {
                garbageTile.fill(new ge.Wall(garbageDirection));
            } catch (e) {
                console.log("Encountered error while creating explosion garbage but ignored it: " + e);

                if (!garbageTile.isEmpty() && garbageTile.occupant.type == ge.EntityTypes.PLAYER) {
                    let hitPlayer = garbageTile.occupant;

                    console.log("Explosion hit a player: " + hitPlayer.id);

                    this.killPlayer(hitPlayer.id);
                }
            }

            console.log(this.grid.asText());
        }
    }

    killTrappedPlayers() {
        let livePlayers = this.players.filter(p => !p.dead);

        if (livePlayers.length === 1) {
            return;
        }

        let pairings = [];

        let unpaired_count = livePlayers.length;

        while (unpaired_count > 1) {
            let player = livePlayers[unpaired_count - 1];

            unpaired_count -= 1;

            for (let i = 0; i < unpaired_count; i++) {
                pairings.push([player, livePlayers[i]])
            }
        }

        let reachablePlayers = new ge.Set();

        for (let i = 0; i < pairings.length; i++) {
            let pairing = pairings[i];

            if (reachablePlayers.contains(pairing[0]) && reachablePlayers.contains(pairing[1])) {
                continue;  // No point traversing if we know both of them are reachable
            }

            if (this.grid.isTraversable(pairing[0].position, pairing[1].position)) {
                reachablePlayers.add(pairing[0]);
                reachablePlayers.add(pairing[1]);
            }
        }

        for (let i = 0; i < livePlayers.length; i++) {
            if (!reachablePlayers.contains(livePlayers[i])) {
                let deadPlayer = livePlayers[i];
                this.killPlayer(deadPlayer.id);
            }
        }
    }

    getWinners() {
        let livePlayers = this.players.filter(p => !p.dead);

        if (livePlayers.length <= 1) {
            return livePlayers;
        }

        return null;
    }
};

ge.Game = class Game {
    constructor(gridSize, playerCount) {
        this.MAX_PLAYERS = 4;  // Modify at your own risk - you may need to define more keys, etc.
        this.MIN_GRID = 4;
        this.playerCount = playerCount;

        if (gridSize < this.MIN_GRID) {
            throw "Minimum grid size is " + this.MIN_GRID;
        }

        if (playerCount > 4 || playerCount < 2) {
            throw "Player count must be within 2 and " + this.MAX_PLAYERS;
        }

        let grid = new ge.Grid(gridSize);
        let gridCorners = [new ge.Point(1, 1), new ge.Point(1, gridSize - 2), new ge.Point(gridSize - 2, gridSize - 2), new ge.Point(gridSize - 2, 1)];
        let players = [];

        for (let i = 0; i < playerCount; i++) {
            players.push(new ge.Player(i, gridCorners[i]));
        }

        this.state = new ge.GameGridState(grid, players);

        this._keyPressLog = {};  // false: unpressed. true: pressed
        this._resetKeyPressLog();

        this._keyDirectionPlayerMap = {
            "KeyW": {direction: ge.Directions.UP, player: 0},
            "KeyS": {direction: ge.Directions.DOWN, player: 0},
            "KeyA": {direction: ge.Directions.LEFT, player: 0},
            "KeyD": {direction: ge.Directions.RIGHT, player: 0},
            "ArrowUp": {direction: ge.Directions.UP, player: 1},
            "ArrowDown": {direction: ge.Directions.DOWN, player: 1},
            "ArrowLeft": {direction: ge.Directions.LEFT, player: 1},
            "ArrowRight": {direction: ge.Directions.RIGHT, player: 1},
            "KeyT": {direction: ge.Directions.UP, player: 2},
            "KeyG": {direction: ge.Directions.DOWN, player: 2},
            "KeyF": {direction: ge.Directions.LEFT, player: 2},
            "KeyH": {direction: ge.Directions.RIGHT, player: 2},
            "KeyI": {direction: ge.Directions.UP, player: 3},
            "KeyK": {direction: ge.Directions.DOWN, player: 3},
            "KeyJ": {direction: ge.Directions.LEFT, player: 3},
            "KeyL": {direction: ge.Directions.RIGHT, player: 3},
        }

        this._playerBombKeys = {
            "KeyQ" : 0,
            "Space" : 1,
            "KeyR" : 2,
            "KeyU" : 3,
        }

        document.addEventListener('keydown', this._logKeyPress.bind(this));
    }

    _resetKeyPressLog() {
        this._keyPressLog[ge.Directions.UP] = [false, false, false, false];
        this._keyPressLog[ge.Directions.DOWN] = [false, false, false, false];
        this._keyPressLog[ge.Directions.LEFT] = [false, false, false, false];
        this._keyPressLog[ge.Directions.RIGHT] = [false, false, false, false];
        this._keyPressLog["bomb"] = [false, false, false, false];
    }

    _logKeyPress(e) {
        e.preventDefault();

        if (this._keyDirectionPlayerMap.hasOwnProperty(e.code)) {
            let keyData = this._keyDirectionPlayerMap[e.code];
            this._keyPressLog[keyData.direction][keyData.player] = true;
        }

        if (this._playerBombKeys.hasOwnProperty(e.code)) {
            this._keyPressLog["bomb"][this._playerBombKeys[e.code]] = true;
        }
    }

    update() {
        // Check for user input: movement
        let directions = [ge.Directions.UP, ge.Directions.DOWN, ge.Directions.LEFT, ge.Directions.RIGHT];

        for (let i = 0; i < directions.length; i++) {
            let keyDirection = directions[i];

            for (let j = 0; j < this.playerCount; j++) {
                let keyPlayerId = j;

                if (this._keyPressLog[keyDirection][keyPlayerId] === true) {
                    if (this.state.playerCanMove(keyPlayerId, keyDirection)) {
                        this.state.movePlayerInDirection(keyPlayerId, keyDirection);
                    }
                }
            }
        }

        // Check for user input: bombs
        for (let i = 0; i < this.playerCount; i++) {
            if (this._keyPressLog["bomb"][i] == true) {
                this.state.playerDropBomb(i, 500)
            }
        }

        this.state.killTrappedPlayers();
        this._resetKeyPressLog();
        console.log(this.state.grid.asText());

        return this.state.getWinners();
    }
};
