const { expect } = require('chai');
const knex = require('knex');
const supertest = require('supertest');
const app = require('../../src/app');
const { makeUserArray } = require('../user/user.fixtures');
const { makePizzaArray, getUserAuthToken, makeMaliciousPizza } = require('./pizzas-fixtures');

describe('Pizza Endpoints', function () {
    const testUsers = makeUserArray();
    const testPizzas = makePizzaArray();
    let db;

    function populateTestData() {
        return db
            .into('users')
            .insert(testUsers)
            .then(() => db
                .into('pizzas')
                .insert(testPizzas));
    }

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DATABASE_URL,
        });
        app.set('db', db);
    });

    after('disconnect from db', () => db.destroy());

    async function cleanUp() {
        await db.raw('TRUNCATE pizzas RESTART IDENTITY CASCADE');
        await db.raw('TRUNCATE users RESTART IDENTITY CASCADE');
    }

    beforeEach('clean the table', cleanUp);

    afterEach('cleanup', cleanUp);

    describe('Unauthorized requests', () => {
        it('responds with 401 Unauthorized for GET /api/pizzas', () => {
            return supertest(app)
                .get('/api/pizzas')
                .expect(401, { error: 'Unauthorized request' });
        });
        it('responds with 401 Unauthorized for GET /api/pizzas/:pizzaId', () => {
            const pizzaId = 1;
            return supertest(app)
                .get(`/api/pizzas/:${pizzaId}`)
                .expect(401, { error: 'Unauthorized request' });
        });
        it('responds with 401 Unauthorized for POST /api/pizzas', () => {
            return supertest(app)
                .post('/api/pizzas')
                .expect(401, { error: 'Unauthorized request' });
        });
        it('responds with 401 Unauthorized for DELETE /api/pizzas/:pizzaId', () => {
            const pizzaId = 1;
            return supertest(app)
                .delete(`/api/pizzas/:${pizzaId}`)
                .expect(401, { error: 'Unauthorized request' });
        });
    });

    describe('GET /api/pizzas', () => {
        context('Given no pizza', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/api/pizzas')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, []);
            });
        });
        context('Given there are pizzas in the database', () => {

            beforeEach('insert users and pizzas', () => populateTestData());

            it('responds with 200 and a list of pizzas', () => {
                return supertest(app)
                    .get('/api/pizzas')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testPizzas.map(pizza => ({ ...pizza, rating: null })));
            });

            context('Given a specific user is authenticated', () => {
                it('responds with 200 and a list of the users pizzas', () => {
                    const user = testUsers[1];
                    return supertest(app)
                        .get('/api/pizzas')
                        .set('Authorization', `Bearer ${getUserAuthToken(user)}`)
                        .expect(200, testPizzas.filter(pizza => pizza.user_id === user.id).map(pizza => ({ ...pizza, rating: null })));
                });
            });
        });
    });

    describe('GET /api/pizzas/:pizza_id', () => {
        context('Given no pizzas', () => {
            it('responds with 404', () => {
                const pizzaId = 123456;
                return supertest(app)
                    .get(`/api/pizzas/${pizzaId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: "Pizza doesn't exist." } });
            });
        });
        context('Given there are pizzas in the database', () => {

            beforeEach('insert users and pizzas', () => populateTestData());

            it('responds with 200 and the specified pizza', () => {
                const pizzaId = 2;
                const expectedPizza = testPizzas.find(pizza => pizza.id === pizzaId);
                return supertest(app)
                    .get(`/api/pizzas/${pizzaId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, { ...expectedPizza, rating: null });
            });

            context('Given a specific user is authenticated', () => {
                const user = testUsers[1];
                it('responds with 200 and the specified pizza if it belongs to the user', () => {
                    const pizzaId = 2;
                    const expectedPizza = testPizzas.find(pizza => pizza.id === pizzaId);
                    return supertest(app)
                        .get(`/api/pizzas/${pizzaId}`)
                        .set('Authorization', `Bearer ${getUserAuthToken(user)}`)
                        .expect(200, { ...expectedPizza, rating: null });
                });
                it('responds with a 403 if the specified pizza does not belong to the user', () => {
                    const pizzaId = 3;
                    return supertest(app)
                        .get(`/api/pizzas/${pizzaId}`)
                        .set('Authorization', `Bearer ${getUserAuthToken(user)}`)
                        .expect(403, { error: { message: `Access is forbidden!` } });
                });
            });
        });

        context(`Given an XSS attack pizza`, () => {
            const {
                maliciousPizza,
                expectedPizza,
            } = makeMaliciousPizza();

            beforeEach('insert malicious pizza', () => {
                return db
                    .into('users')
                    .insert(testUsers)
                    .then(() => db
                        .into('pizzas')
                        .insert([maliciousPizza]));
            });

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/pizzas/${maliciousPizza.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.name).to.eql(expectedPizza.name);
                        expect(res.body.crust).to.eql(expectedPizza.crust);
                        expect(res.body.sauce).to.eql(expectedPizza.sauce);
                        expect(res.body.cheese).to.eql(expectedPizza.cheese);
                        expect(res.body.meat).to.eql(expectedPizza.meat);
                        expect(res.body.topping).to.eql(expectedPizza.topping);
                        expect(res.body.comments).to.eql(expectedPizza.comments);
                    });
            });
        });
    });

    describe(`POST /api/pizzas`, () => {
        beforeEach('insert users', () => {
            return db
                .into('users')
                .insert(testUsers);
        });

        it(`creates an pizza, responding with 201 and the new pizza`, () => {
            const newPizza = testPizzas[2];
            return supertest(app)
                .post('/api/pizzas')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newPizza)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(newPizza.name);
                    expect(res.body.crust).to.eql(newPizza.crust);
                    expect(res.body.sauce).to.eql(newPizza.sauce);
                    expect(res.body.cheese).to.eql(newPizza.cheese);
                    expect(res.body.meat).to.eql(newPizza.meat);
                    expect(res.body.topping).to.eql(newPizza.topping);
                    expect(res.body.comments).to.eql(newPizza.comments);
                    expect(res.body).to.have.property('id');
                    expect(res.headers.location).to.eql(`/api/pizzas/${res.body.id}`);
                })
                .then(postRes => {
                    supertest(app)
                        .get(`/api/pizzas/${postRes.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(postRes.body);
                });
        });

        const requiredFields = ['name', 'crust', 'sauce', 'cheese', 'meat', 'topping'];

        requiredFields.forEach(field => {
            const newPizza = { ...testPizzas[0] };

            it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                delete newPizza[field];
                return supertest(app)
                    .post('/api/pizzas')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(newPizza)
                    .expect(400, { error: { message: `Missing '${field}' in request body` } });
            });
        });

        context('Given a specific user is authenticated', () => {
            it('creates an pizza that belongs to the user responding with 201 and the new pizza', () => {
                const user = testUsers[1];
                const newPizza = testPizzas[1];
                return supertest(app)
                    .post('/api/pizzas')
                    .set('Authorization', `Bearer ${getUserAuthToken(user)}`)
                    .send(newPizza)
                    .expect(201)
                    .expect(res => {
                        expect(res.body.name).to.eql(newPizza.name);
                        expect(res.body.crust).to.eql(newPizza.crust);
                        expect(res.body.sauce).to.eql(newPizza.sauce);
                        expect(res.body.cheese).to.eql(newPizza.cheese);
                        expect(res.body.meat).to.eql(newPizza.meat);
                        expect(res.body.topping).to.eql(newPizza.topping);
                        expect(res.body.comments).to.eql(newPizza.comments);
                        expect(res.body.user_id).to.eql(user.id);
                        expect(res.body).to.have.property('id');
                        expect(res.headers.location).to.eql(`/api/pizzas/${res.body.id}`);
                    })
                    .then(postRes => {
                        supertest(app)
                            .get(`/api/pizzas/${postRes.body.id}`)
                            .set('Authorization', `Bearer ${getUserAuthToken(user)}`)
                            .expect(postRes.body);
                    });
            });
        });
    });

    describe(`DELETE /api/pizzas/:pizza_id`, () => {
        context('Given no pizza', () => {
            it('responds with 404', () => {
                const pizzaId = 123456;
                return supertest(app)
                    .delete(`/api/pizzas/${pizzaId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: "Pizza doesn't exist." } });
            });
        });
        context('Given there are pizzas in the database', () => {

            beforeEach('insert users and pizzas', () => populateTestData());

            it('responds with 204 and removes the pizza', () => {
                const idToRemove = 2;
                return supertest(app)
                    .delete(`/api/pizzas/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then((res) =>
                        supertest(app)
                            .get(`/api/pizzas/${idToRemove}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(404, { error: { message: `Pizza doesn't exist.` } })
                    );
            });
        });

    });

    describe(`PATCH /api/pizzas/:pizza_id`, () => {
        context(`Given no pizza`, () => {
            it(`responds with 404`, () => {
                const pizzaId = 123456
                return supertest(app)
                    .patch(`/api/pizzas/${pizzaId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: `Pizza doesn't exist.` } })
            });
        });
        context('Given there are pizzas in the database', () => {

            beforeEach('insert users and pizzas', () => populateTestData());

            it('responds with 204 and updates the pizza', () => {
                const idToUpdate = 2;
                const updatedPizza = {
                    name: 'updated pizza name',
                    comments: 'updated pizza comments',
                    rating: '3'
                };
                const expectedPizza = {
                    ...testPizzas[idToUpdate - 1],
                    ...updatedPizza
                };
                return supertest(app)
                    .patch(`/api/pizzas/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updatedPizza)
                    .expect(204)
                    .then(() => supertest(app)
                        .get(`/api/pizzas/${idToUpdate}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(expectedPizza)
                    );
            });

            it(`responds with 400 when no required fields supplied`, () => {
                const idToUpdate = 2;
                return supertest(app)
                    .patch(`/api/pizzas/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({ irrelevantField: 'foo' })
                    .expect(400, { error: { message: `Request body must contain at least one of name, crust, sauce, cheese, meat, topping, comments, rating` } });
            });

            it(`responds with 400 and an error message when the 'rating' is invalid`, () => {
                const idToUpdate = 2;
                return supertest(app)
                    .patch(`/api/pizzas/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({
                        rating: "8"
                    })
                    .expect(400, { error: { message: 'Rating must be one of 1, 2, 3, 4, 5' } });
            });

            it(`responds with 204 when updating only a subset of fields`, () => {
                const idToUpdate = 2;
                const updatedPizza = {
                    name: 'updated pizza name',
                };
                const expectedPizza = {
                    ...testPizzas[idToUpdate - 1],
                    ...updatedPizza,
                    rating: null
                };
                return supertest(app)
                    .patch(`/api/pizzas/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({
                        ...updatedPizza,
                        fieldToIgnore: 'should not be in GET response'
                    })
                    .expect(204)
                    .then(() =>
                        supertest(app)
                            .get(`/api/pizzas/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedPizza)
                    );
            });
        });
    });

});
