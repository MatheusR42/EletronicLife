var _ = require('lodash');

console.reset = function () {
    return process.stdout.write('\033c');
}

var plan = [
    "#####################",
    "#       #      o   ##",
    "#                   #",
    "#       o     ##   ##",
    "#    o              #",
    "#           ##      #",
    "#     ##            #",
    "#          o        #",
    "#####################"
];

var directions = {
    "n": new Vector(0, -1),
    "ne": new Vector(1, -1),
    "e": new Vector(1, 0),
    "se": new Vector(1, 1),
    "s": new Vector(0, 1),
    "sw": new Vector(1, -1),
    "w": new Vector(-1, 0),
    "nw": new Vector(-1, -1)
}

var directionNames = Object.keys(directions);


function Vector(x, y) {
    this.x = x;
    this.y = y;
}

Vector.prototype.plus = function (other) {
    return new Vector(this.x + other.x, this.y + other.y);
}

function Grid(width, height) {
    this.space = new Array(width * height);
    this.width = width;
    this.height = height;
}

Grid.prototype.isInside = function (vector) {
    return vector.x >= 0 && vector.x < this.width &&
        vector.y >= 0 && vector.y < this.height;
}

Grid.prototype.get = function (vector) {
    return this.space[vector.x + this.width * vector.y];
}

Grid.prototype.set = function (vector, value) {
    this.space[vector.x + this.width * vector.y] = value;
}

Grid.prototype.forEach = function (f, context) {
    for (var y = 0; y < this.height; y++) {
        for (var x = 0; x < this.width; x++) {
            var value = this.space[x + y * this.width];

            if (value != null) {
                f.call(context, value, new Vector(x, y))
            }
        }
    }
}

function BoucingCritter() {
    this.creature = true;
    this.direction = _.sample(directionNames);
}

BoucingCritter.prototype.act = function (view) {
    if (view.look(this.direction) != " ") {
        this.direction = view.find(" ") || "s";
    }

    return { type: "move", direction: this.direction }
}

function elementFromChar(legend, ch) {
    if (ch == " ") {
        return null
    }

    var element = new legend[ch]();
    element.originChar = ch;
    return element;
}

function charFromElement(element) {
    if (element == null) {
        return " ";
    }

    return element.originChar;
}

function World(map, legend) {
    this.grid = new Grid(map[0].length, map.length);
    this.legend = legend;

    map.forEach(function (line, y) {
        for (var x = 0; x < line.length; x++) {
            this.grid.set(new Vector(x, y), elementFromChar(legend, line[x]))
        }
    }, this)
}

World.prototype.toString = function () {
    var output = "";

    for (var y = 0; y < this.grid.height; y++) {
        for (var x = 0; x < this.grid.width; x++) {
            var element = this.grid.get(new Vector(x, y));
            output += charFromElement(element);
        }
        output += "\n";
    }

    return output;
}

World.prototype.turn = function () {
    var acted = [];

    this.grid.forEach(function (critter, vector) {
        if (critter.act && acted.indexOf(critter) == -1) {
            acted.push(critter);
            this._letAct(critter, vector);
        }
    }, this);
}

World.prototype._letAct = function (critter, vector) {
    var action = critter.act(new View(this, vector));

    if (action && action.type == "move") {
        var dest = this._checkDestination(action, vector);

        if (dest && this.grid.get(dest) == null) {
            this.grid.set(vector, null);
            this.grid.set(dest, critter);
        }
    }
}

World.prototype._checkDestination = function (action, vector) {
    if (directions.hasOwnProperty(action.direction)) {
        var dest = vector.plus(directions[action.direction]);

        if (this.grid.isInside(dest)) {
            return dest;
        }
    }
}

World.prototype.cretureCount = function(){
    var count = 0;

    this.grid.forEach(function (item) {
        if(item.creature != null)
            count++
    }, this);

    return count;
}


function Wall() { }

function View(world, vector) {
    this.world = world;
    this.vector = vector;
}

View.prototype.look = function (dir) {
    var target = this.vector.plus(directions[dir]);

    if (this.world.grid.isInside(target)) {
        return charFromElement(this.world.grid.get(target))
    }

    return "#";
}

View.prototype.findAll = function (ch) {
    var found = [];

    for (var dir in directions) {
        if (this.look(dir) == ch) {
            found.push(dir)
        }
    }

    return found;
}

View.prototype.find = function (ch) {
    var found = this.findAll(ch);
    if (found.length == 0) {
        return null;
    }

    return _.sample(found);
}

function LifelikeWorld(map, legend){
    World.call(this, map, legend);
}

LifelikeWorld.prototype = Object.create(World.prototype);

var actionTypes = Object.create(null);
actionTypes.grow = function(critter){
    critter.energy += 0.5;
    return true;
}

actionTypes.move = function(critter, vector, action){
    var dest = this._checkDestination(action, vector);

    if(dest == null || critter.energy <= 1 || this.grid.get(dest) != null){
        return false
    }

    critter.energy -= .3;
    this.grid.set(vector, null);
    this.grid.set(dest, critter);
    
    return true;
}

actionTypes.eat = function(critter, vector, action){
    var dest = this._checkDestination(action, vector);
    var atDest = dest != null && this.grid.get(dest);

    if(!atDest || !atDest.energy == null){
        return false
    }

    critter.energy += atDest.energy;
    this.grid.set(dest, null);
    return true;
}

actionTypes.reproduce = function(critter, vector, action){
    var baby = elementFromChar(this.legend, critter.originChar);
    var dest = this._checkDestination(action, vector);

    if(dest == null || critter.energy <= 2 * baby.energy || this.grid.get(dest) != null){
        return false;
    }

    critter.energy -= 2 * baby.energy;
    this.grid.set(dest, baby);
    
    return true;
}

function Plant(){
    this.plant = true;
    this.energy = 3 + Math.random() * 4
}

Plant.prototype.act = function(context){
    if(this.energy > 15){
        var space = context.find(" ");
        if(space){
            return {type: "reproduce", direction: space}
        }
    }

    if(this.energy < 20){
        return {type: "grow"}
    }
}

function PlantEater(){
    this.creature = true;
    this.energy = 20;
    this.direction = _.sample(directionNames);
    this.hunger = true; 
}

PlantEater.prototype.act = function(context){
    var space = context.find(" ");

    if(this.energy > 60 && space){
        this.hunger = false;
        return {type: "reproduce", direction: space}
    }

    if(this.energy < 23){
        this.hunger = true;
    }

    var plant = context.find("*");
    if(plant && this.hunger){

        return {type: "eat", direction: plant}
    }


    if (context.look(this.direction) == " " && _.random(100) < 90) {
        return { type: "move", direction: this.direction }
    }


    if(space){
        this.direction = space;
        return {type: "move", direction: space}
    }
}

LifelikeWorld.prototype._letAct = function(critter, vector){
    var action = critter.act(new View(this, vector));
    var handled = action && action.type in actionTypes && actionTypes[action.type].call(this, critter, vector, action);

    if(!handled){
        critter.energy -= .1;
        if(critter.energy <= 0){
            this.grid.set(vector, null);
        }
    }

}

LifelikeWorld.prototype.plantCount = function(){
    var count = 0;

    this.grid.forEach(function (item) {
        if(item.plant != null)
            count++
    }, this);

    return count;
}

function createEcosystem(width, height, elements){
    this.addElements = function(grid, elements){
        var elements = this.elementsToArray(elements);
        var elementPositions = _.sampleSize(_.range(innerGrid.length - 1), elements.length);
        
        elementPositions.forEach((item, index) => {
            var elementIndex = _.random(elements.length - 1);
            grid[item] = elements[elementIndex]
            elements.splice(elementIndex, 1);
        });

        return grid;
    }

    this.elementsToArray = function(elements){
        var result = [];

        for(element in elements){
            for(var i = 0; i < elements[element]; i++){
                result.push(element);
            }
        }

        return result;
    }

    this.listToMatrix = function(list, elementsPerSubArray) {
        var matrix = [], i, k;

        for (i = 0, k = -1; i < list.length; i++) {
            if (i % elementsPerSubArray === 0) {
                k++;
                matrix[k] = [];
            }

            matrix[k].push(list[i]);
        }

        return matrix;
    }

    this.matrixElementsToString = function(matrix){
        return matrix.map(function(row){
            return row.join('');
        })
    }

    this.addBorders = function(innerGrid, width){
        var finalGrid = innerGrid.map(row => "#" + row + "#");
        finalGrid.unshift("#".repeat(width + 2));
        finalGrid.push("#".repeat(width + 2));

        return finalGrid;
    }

    var innerGrid = " ".repeat(width * height).split("");
    
    return this.addBorders(this.matrixElementsToString(this.listToMatrix(this.addElements(innerGrid, elements), width)), width);
}



// var world = new World(plan, { "#": Wall, "o": BoucingCritter });

// for (var i = 0; i < 30; i++) {
//     setTimeout(() => {
//         world.turn();
//         console.reset();
//         console.log(world.toString())
//     }, 300 * i) 
// }

var valley = new LifelikeWorld(
    createEcosystem(50, 20, {"#": 15, "o": 15, "*": 25}),
    {
        "#": Wall,
        "o": PlantEater,
        "*": Plant
    }
);

function nexTurn(){
    setTimeout(() => {
        valley.turn();
        console.reset();
        console.log(valley.toString())
        console.log('Creatures: '+ valley.cretureCount() + '\nPlants: ' + valley.plantCount());
        if(valley.cretureCount() > 0){
            nexTurn();
        }
    }, 100); 
}

nexTurn();
