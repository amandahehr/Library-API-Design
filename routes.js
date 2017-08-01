const monk = require('monk')
const Joi = require('joi')
require('dotenv').config()

// get the DBURL value 
const db = monk(process.env.DBURL)
// get or create a collection in mongo
const books = db.get('books')
const users = db.get('users')

// schema to test new objects against
const publicationSchema = Joi.object().keys({
  date: Joi.string(),
  publisher: Joi.string(),
  edition: Joi.string()
}).and('date', 'publisher', 'edition')

const checkedSchema = Joi.object().keys({
  available: Joi.boolean(),
  user: Joi.string().when('available', {
     is: false,
     then: Joi.string().required(),
     otherwise: Joi.string().allow("", null)
   })
}).and('available', 'user')

const reservedSchema = Joi.object().keys({
  reserved: Joi.boolean(),
  user: Joi.string().when('reserved', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().allow("", null)
  })
}).and('reserved', 'user')

const copiesSchema = Joi.object().keys({
  id: Joi.string(),
  checked: checkedSchema,
  reserved: reservedSchema
}).and('id', 'checked', 'reserved')


const bookSchema = Joi.object().keys({
  title: Joi.string(),
  author: Joi.string(),
  genre: Joi.string(),
  imgurl: Joi.string(),
  publication: publicationSchema,
  copies: Joi.array().items(copiesSchema)
}).and('title', 'author', 'genre', 'imgurl', 'publication', 'copies')

const borrowedUserSchema = Joi.object().keys({
  bookID: Joi.string(),
  copyID: Joi.string(),
  borrowDate: Joi.string(),
  dueDate: Joi.string()
}).and('bookID', 'copyID', 'borrowDate', 'dueDate')

const reservedUserSchema = Joi.object().keys({
  bookID: Joi.string(),
  copyID: Joi.string(),
  dueDate: Joi.string()
}).and('bookID', 'copyID', 'dueDate')

const feesSchema = Joi.object().keys({
  bookID: Joi.string(),
  copyID: Joi.string(),
  dueDate: Joi.string(),
  returnDate: Joi.string(),
  fee: Joi.string()
}).and('bookID', 'copyID', 'dueDate', 'returnDate', 'fee')

const userSchema = Joi.object().keys({
  name: Joi.string(),
  email: Joi.string(),
  borrowed: Joi.array().items(borrowedUserSchema).allow("", null),
  reserved: Joi.array().items(reservedUserSchema).allow("", null),
  fees: Joi.array().items(feesSchema).allow("", null)
}).and('name', 'email', 'borrowed', 'reserved', 'fees')

//exports
module.exports = [
  {
    method: 'GET',
    path: '/',
    handler(request, reply) { 
      return reply('Library API')
    }
  },
  {
    method: 'GET',
    path: '/books',
    handler: async (request, reply) => {
      let allBooks = await books.find(request.query) //handle url queries
      return reply(allBooks)
    }
  },
  {
    method: 'GET',
    path: '/books/{bookID}',
    handler: async (request, reply) => {
      let book = await books.find({_id: Number(request.params.bookID)})
      singlebook = book[0]
      return reply(singlebook)
    }
  },
  {
    method: 'GET',
    path: '/library',
    handler(request, reply) {
      
      return reply.view('index')
    }
  },
  {
    method: 'GET',
    path: '/library/books',
    handler: async (request, reply) => {
      let allBooks = await books.find(request.query) //handle url queries
      mybooks = allBooks
      return reply.view('multiplebooks', mybooks)
    }
  },
  {
    method: 'GET',
    path: '/library/books/{bookID}',
    handler: async (request, reply) => {
      let book = await books.find({_id: Number(request.params.bookID)})
      singlebook = book[0]
      singlebook.ncopies = singlebook.copies.length
      let availablecopies = 0
      for(i=0; i<singlebook.copies.length; i++){
        if (singlebook.copies[i].checked.available == true){
          availablecopies++
        }
      }
      singlebook.availablecopies = availablecopies
      return reply.view('singlebook', singlebook)
    }
  },
  {
    method: 'POST',
    path: '/books',
    config: {
      validate: {
        payload: bookSchema
      }
    },
    handler: createNewBook
  },
  {
    method: 'PUT',
    path: '/books',
    handler: updateBook
  },
  {
    method: 'DELETE',
    path: '/books',
    handler: async (request, reply) => {
      try {
        let removed = await books.remove({_id: request.payload['_id']}, {multi: false})
        return reply ().code(204)
      } catch (err) {
        console.error(err)
      }
    }
  },
  //STYLESHEETS/IMAGES
  {
    method: 'GET',
    path: '/library/styles.css',
    handler: {file: 'templates/css/styles.css'}
  },
  {
    method: 'GET',
    path: '/library/fluid_grid.css',
    handler: {file: 'templates/css/fluid_grid.css'}
  },
  {
    method: 'GET',
    path: '/library/images/{image}',
    handler: async (request, reply) => {
      {file: 'templates/images/'+request.params.image}
    }
  },
  //USERS
  {
    method: 'GET',
    path:'/users',
    handler: async (request, reply) => {
      let allUsers = await users.find(request.query) //handle url queries
      return reply(allUsers)
    }
  },
  {
    method: 'GET',
    path: '/users/{userID}',
    handler: async (request, reply) => {
      let user = await user.find({_id: Number(request.params.userID)})
      singleuser = user[0]
      return reply(singleuser)
    }
  },
  {
    method: 'POST',
    path: '/users',
    config: {
      validate: {
        payload: userSchema
      }
    },
    handler: createNewUser
  },
  {
    method: 'PUT',
    path: '/users',
    handler: updateUser
  },
  {
    method: 'GET',
    path: '/users/late-fees',
    handler: async (request, reply) => {
      let allUsers = await users.find(request.query)
      let feeUsers = []
      for(i=0; i<allUsers.length; i++){
        if (allUsers[i]['fees'].length > 0){
          feeUsers[i] = allUsers[i]
        }
      }
      return reply(feeUsers)
    }
  }
]


//functions
async function createNewBook (request, reply) {
  let newID = 0;
  try {
    let lastBookNum = await books.find({}, {limit: 1, sort: {'_id': -1}})

    if(lastBookNum.length == 0){
      newID = 1;
    }
    else {
      newID = lastBookNum[0]['_id'] + 1
    }

    let newBookObject = request.payload
    newBookObject['_id'] = newID
    let newBook = await books.insert(newBookObject)
    return reply(newBook).code(201)
  }
  catch (err) {
    console.error(err)
  }
}


async function updateBook (request, reply) {
  try {
    let bookToUpdate = await books.update({_id: request.payload['_id']}, {$set: request.payload})
    return reply(request.payload).code(200)
  } catch (err) {
    console.error(err)
  }
}

async function createNewUser (request, reply) {
  let newID = 0;
  try {
    let lastUserNum = await users.find({}, {limit: 1, sort: {'_id': -1}})

    if(lastUserNum.length == 0){
      newID = 1;
    }
    else {
      newID = lastUserNum[0]['_id'] + 1
    }

    let newUserObject = request.payload
    newUserObject['_id'] = newID
    let newUser = await users.insert(newUserObject)
    return reply(newUser).code(201)
  }
  catch (err) {
    console.error(err)
  }
}


async function updateUser (request, reply) {
  try {
    let userToUpdate = await users.update({_id: request.payload['_id']}, {$set: request.payload})
    return reply(request.payload).code(200)
  } catch (err) {
    console.error(err)
  }
}

async function getLateFees(request, reply){

}