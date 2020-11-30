const app = require('../src/app');

describe('App', () => {
    it('GET / responds with 200 containing "Dynamic Pizza API"', () => {
        return supertest(app)
            .get('/')
            .expect(200, 'Dynamic Pizza API');
    });
});