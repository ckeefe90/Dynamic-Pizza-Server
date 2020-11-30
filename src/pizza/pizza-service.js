const PizzaService = {
    getAllPizzas(knex, user) {
        const qb = knex.select('*').from('pizzas');
        if (user) {
            qb.where('user_id', user);
        }
        return qb;
    },
    insertPizza(knex, newPizza) {
        return knex
            .insert(newPizza)
            .into('pizzas')
            .returning('*')
            .then(rows => {
                return rows[0];
            });
    },
    getById(knex, id) {
        return knex
            .from('pizzas')
            .where('id', id)
            .select('*')
            .first();
    },
    deletePizza(knex, id) {
        return knex('pizzas')
            .where({ id })
            .delete();
    },
    updatePizza(knex, id, newPizzaFields) {
        return knex('pizzas')
            .where({ id })
            .update(newPizzaFields);
    },
};

module.exports = PizzaService;