const jwt = require('jsonwebtoken');

function makePizzaArray() {
    return Object.freeze([
        Object.freeze({
            id: 1,
            name: 'Buffalo Beef',
            crust: 'Deep Dish',
            sauce: 'Buffalo',
            cheese: 'Mozzarella',
            meat: 'Chicken',
            veggie: 'None',
            comments: 'Sounds good',
            user_id: 1
        }),
        Object.freeze({
            id: 2,
            name: 'BBQ Chicken',
            crust: 'Thin Crust',
            sauce: 'Barbecue',
            cheese: 'Mozzarella',
            meat: 'Chicken',
            veggie: 'Onion',
            comments: '',
            user_id: 2
        }),
        Object.freeze({
            id: 3,
            name: 'Pesto Madness',
            crust: 'Hand Tossed',
            sauce: 'Pesto',
            cheese: 'Ricotta',
            meat: 'None',
            veggie: 'Artichoke',
            comments: 'Don\'t want to try',
            user_id: 3
        })
    ]);
}

function makeMaliciousPizza() {
    const maliciousPizza = Object.freeze({
        id: 911,
        name: 'Naughty naughty very naughty <script>alert("xss");</script>',
        crust: 'Stuffed Crust',
        sauce: 'Alfredo',
        cheese: 'Feta',
        meat: 'Bacon',
        veggie: 'Spinach',
        comments: 'Sounds good',
        user_id: 1
    });
    const expectedPizza = Object.freeze({
        ...maliciousPizza,
        name: 'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;'
    });
    return {
        maliciousPizza,
        expectedPizza
    };
}

function getUserAuthToken(user) {
    return jwt.sign(user, process.env.JWT_SECRET)
}

module.exports = { makePizzaArray, makeMaliciousPizza, getUserAuthToken }