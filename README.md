# Library API Design

DESCRIPTION: 
API design for an online library including actions to view and manage books and users. The Library includes an HTML user interface that posts queries to books via UI elements. 

INCLUDES:
hapi, inert, vision, ejs, monk, joi, dotenv

TO RUN: 
node index.js


API:

/books - get all books, post new book, delete book, update book

/books/{book id} - get book by id

/users - get all users, post new user, delete user, update user

/users/{user id} - get user by id

/users/late-fees - get all users with late fees


LIBRARY:

/library - get library home page

/library/books - get library view/search books page

/library/books/{book id} - get library single book page




