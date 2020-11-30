const path = require('path');
const express = require('express');
const xss = require('xss');
const PizzaService = require('./pizza-service');
const logger = require('../logger');

const pizzaRouter = express.Router();
const jsonParser = express.json();
const starRating = ['1', '2', '3', '4', '5'];

const serializePizza = pizza => ({
    id: pizza.id,
    name: xss(pizza.name),
    crust: xss(pizza.crust),
    sauce: xss(pizza.sauce),
    cheese: xss(pizza.cheese),
    meat: xss(pizza.meat),
    topping: xss(pizza.topping),
    comments: xss(pizza.comments),
    rating: pizza.rating,
    user_id: pizza.user_id,
});

pizzaRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db');
        PizzaService.getAllPizzas(knexInstance, res.locals.user_id)
            .then(pizzas => {
                res.json(pizzas.map(serializePizza));
            })
            .catch(next);
    })
    .post(jsonParser, (req, res, next) => {
        const { name, crust, sauce, cheese, meat, topping, comments, user_id } = req.body;
        const newPizza = { name, crust, sauce, cheese, meat, topping, user_id };

        for (const [key, value] of Object.entries(newPizza)) {
            if (res.locals.user_id && key === 'user_id') continue;
            if (!value) {
                return res.status(400).json({ error: { message: `Missing '${key}' in request body` } });
            }
        }

        newPizza.name = name;
        newPizza.crust = crust;
        newPizza.sauce = sauce;
        newPizza.cheese = cheese;
        newPizza.meat = meat;
        newPizza.topping = topping;
        newPizza.comments = comments || '';
        newPizza.user_id = res.locals.user_id || user_id;

        const knexInstance = req.app.get('db');
        PizzaService.insertPizza(knexInstance, newPizza)
            .then(pizza => {
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${pizza.id}`))
                    .json(serializePizza(pizza));
            })
            .catch(next);
    });

pizzaRouter
    .route('/:pizza_id')
    .all((req, res, next) => {
        PizzaService.getById(
            req.app.get('db'),
            req.params.pizza_id
        )
            .then(pizza => {
                if (!pizza) {
                    return res.status(404).json({ error: { message: `Pizza doesn't exist.` } });
                }
                const userId = res.locals.user_id;
                if (userId && pizza.user_id !== userId) {
                    return res.status(403).json({ error: { message: `Access is forbidden!` } });
                }
                res.pizza = pizza;
                next();
            })
            .catch(next);
    })
    .get((req, res) => {
        res.json(serializePizza(res.pizza));
    })
    .delete((req, res, next) => {
        const knexInstance = req.app.get('db');
        PizzaService.deletePizza(knexInstance, res.pizza.id)
            .then(() => {
                logger.info(`Pizza with id ${res.pizza.id} deleted.`);
                res.status(204).end();
            })
            .catch(next);
    })
    .patch(jsonParser, (req, res, next) => {
        const { name, crust, sauce, cheese, meat, topping, comments, rating } = req.body;
        const pizzaToUpdate = { name, crust, sauce, cheese, meat, topping, comments, rating };

        const numberOfValues = Object.values(pizzaToUpdate).filter(Boolean).length;
        if (numberOfValues === 0) {
            return res
                .status(400)
                .json({ error: { message: `Request body must contain at least one of ${Object.keys(pizzaToUpdate).join(", ")}` } });
        }
        if (rating && !starRating.includes(rating)) {
            return res
                .status(400)
                .json({ error: { message: `Rating must be one of ${starRating.join(", ")}` } });
        }

        PizzaService.updatePizza(
            req.app.get('db'),
            req.params.pizza_id,
            pizzaToUpdate
        )
            .then(() => {
                res.status(204).end();
            })
            .catch(next);
    });

module.exports = pizzaRouter;