# EletronicLife
Part of Eloquent JavaScript: A Modern Introduction to Programming book

[![Run on Repl.it](https://repl.it/badge/github/MatheusR42/EletronicLife)](https://repl.it/github/MatheusR42/EletronicLife)

## Install lodash dependency
```
npm install
```

## Run
```
node EletronicLife
```

![Alt text](example.jpg?raw=true "EletronicLife")

## Change ecosystem config

You can chage the size of the ecosystem and the quantity of plants, creatures
and walls changing the line below:

```JavaScript
var valley = new LifelikeWorld(
    createEcosystem(50, 20, {"#": 15, "o": 15, "*": 25}),
    {
        "#": Wall,
        "o": PlantEater,
        "*": Plant
    }
);
```
