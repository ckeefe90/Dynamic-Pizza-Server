# Dynamic Pizza Generator - Server

## Summary

This is a random pizza generator app that will allow users to generate random pizzas.
Users can generate a completely random pizza or make a few selections.  
Users can create an account to save pizzas but it's not required.
Users can log out and sign back in to update the pizzas that are saved.
Comments are optional. Rating can be updated after the pizza is saved.
Save Changes button is disabled until comments or rating is updated. 
Users can delete the pizzas. 

## Technology Used

- Node.js
- Express
- Postgres
  
### Testing

- Mocha
- Chai
- Supertest

## API

### Auth
#### POST /api/login
#### POST /api/signup

### Pizzas
#### GET /api/pizzas
#### POST /api/pizzas
#### GET /api/pizzas/:pizza_id
#### DELETE /api/pizzas/:pizza_id
#### PATCH /api/pizzas/:pizza_id


## Live App

https://dynamic-pizza-generator.vercel.app/

## Client Repository

https://github.com/ckeefe90/Dynamic-Pizza-Client