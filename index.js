const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express=require('express')
const app=express()
const cors=require('cors')
require('dotenv').config()
const port=process.env.PORT || 5000

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
    const menuCollection=client.db('finalDB').collection('menu')
    const cartCollection=client.db('finalDB').collection('carts')
    const userCollection=client.db('finalDB').collection('users')

    app.get('/menu',async(req,res)=>{
        const result=await menuCollection.find().toArray()
        res.send(result)
    })

    // -----------------------cart------------------------
    app.post('/carts',async(req,res)=>{
      const newCart=req.body;
      const result=await cartCollection.insertOne(newCart)
      res.send(result)
    })
    app.get('/carts/:email',async(req,res)=>{
      const email=req.params.email;
      const query={email:email}
      const result=await cartCollection.find(query).toArray()
      res.send(result)
    })
    app.delete('/carts/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)}
      const result=await cartCollection.deleteOne(query)
      res.send(result)
    })
    // --------------user--------------
    app.post('/users',async(req,res)=>{
      const user=req.body;
      const query={email:user.email}
      const existingEmail=await userCollection.findOne(query)
      if(existingEmail){
        return res.send({message:'user already ase',insertedId:null})
      }
      const result=await userCollection.insertOne(user)
      res.send(result)
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


app.get('/',(req,res)=>{
    res.send('can you give me a pizza please?')
})

app.listen(port,()=>{
    console.log(`my port in running on the ${port}`);
})