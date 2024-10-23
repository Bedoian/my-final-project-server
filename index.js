const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
const stripe = require('stripe')('sk_test_51QBvluJrPFiTPNXxGNFmBWkFOse3gZfm9ogaqD56zNGTl4lRF4i1f5GRB6ra1hyWcr9VqmAQghzCAtA6d4Wd3Ou000ZDTZatiS')
require('dotenv').config()
const port = process.env.PORT || 5000

// middleware
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jxt94sc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const menuCollection = client.db('finalDB').collection('menu')
    const cartCollection = client.db('finalDB').collection('carts')
    const userCollection = client.db('finalDB').collection('users')
    const paymentCollection = client.db('finalDB').collection('payments')

    // jwt releted api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_SECRET, { expiresIn: "10h" })
      res.send({ token })
    })

    // middlewares
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }
    // verify Admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // --------------user--------------

    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query);
      let admin = false
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    })
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already ase', insertedId: null })
      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    })


    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query)
      res.send(result)
    })
    app.patch('/users/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    // ----------------------menu-----------------------
    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray()
      res.send(result)
    })
    app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body
      const result = await menuCollection.insertOne(item)
      res.send(result)
    })
    app.delete('/menu/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.deleteOne(query)
      res.send(result)
    })
    app.get('/menu/:id', async (req, res) => {
      const id = req.params.id;
      // To Do: make _id with objetId and new
      const query = { _id: id }
      const result = await menuCollection.findOne(query)
      res.send(result)
    })
    app.patch('/menu/:id', async (req, res) => {
      const id = req.params.id;
      const item = req.body;
      // To Do: make _id with objetId and new
      const filter = { _id: id }
      const updatedDoc = {
        $set: {
          ...item
        }
      }
      const result = await menuCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })
    // -----------------------cart------------------------
    app.post('/carts', async (req, res) => {
      const newCart = req.body;
      const result = await cartCollection.insertOne(newCart)
      res.send(result)
    })
    app.get('/carts/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await cartCollection.find(query).toArray()
      res.send(result)
    })
    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartCollection.deleteOne(query)
      res.send(result)
    })

    // -----------------payment---------------
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100)
      // console.log(amount)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret,
      })
    })

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      // console.log(payment);
      const query = {
        _id: {
          $in: payment.cartIds.map(id => new ObjectId(id))
        }
      }
      const deleteResult = await cartCollection.deleteMany(query)
      const result = await paymentCollection.insertOne(payment)
      res.send({ result, deleteResult })
    })
    app.get('/payments/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await paymentCollection.find(query).toArray()
      res.send(result)
    })

    // ---------------information--------------
    app.get('/admin-stats', async (req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const menuIntems = await menuCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount()
      // const payment=await paymentCollection.find().toArray();
      // const reveniew=payment.reduce((total,payment)=>total+payment.price,0)
      const result = await paymentCollection.aggregate([
        {
          $group: {
            _id: null,
            totalrevenue: {
              $sum: '$price'
            }
          }
        }
      ]).toArray()
      const revenue = result.length > 0 ? result[0].totalrevenue : 0
      res.send({ users, menuIntems, orders, revenue })
    })
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('can you give me a pizza please?')
})

app.listen(port, () => {
  console.log(`my port in running on the ${port}`);
})