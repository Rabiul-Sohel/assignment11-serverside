require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken')
const app = express();
const cors = require('cors')
const cookieParser = require('cookie-parser')
const port = 5000;

// MIDDLEWARE
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://foodie-47f25.web.app',
    'https://foodie-47f25.firebaseapp.com'
  ],
  credentials: true,
  maxAge: 360000
}))
app.use(express.json())
app.use(cookieParser())

// CREATED MIDDLEWARE
const tokenVerify = (req, res, next)=>{
  const token = req.cookies.token;
  if(!token){
    return res.status(401).send({message: 'Not authorized'})
  } 
  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded)=>{
     console.log(err, decoded);
    if(err){
     
      return  res.status(401).send({message: 'Not authorized'})
    } else {
      req.user = decoded
      next() 
    }
  } )
   
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ndy3clf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    // collections
    const foodCollection = client.db('foodieDB').collection('foods')
    const userCollection = client.db('foodieDB').collection('users')
    // const orderCollection = client.db('foodieDB').collection('orders')

    // Connect the client to the server	(optional starting in v4.7)
     client.connect();

    // POSTING JWT
    app.post('/api/v2/jwt', async(req, res) =>{
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SECRET, {expiresIn: '2h'})
      res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'none',
       
       
      })
      res.send({message: 'Cookie set successfully'})
      
    })


    // CLEARING COOKIE
    app.get('/api/v2/jwt/clear', async(req, res) =>{
      // const token = req.cookies.token;
      res.clearCookie('token')
      res.send({message: 'clear cookie successful'})

      
    })

    // POSTING USER
    app.post('/api/v2/users', async(req, res)=>{
      const user = req.body;
      
      const result = await userCollection.insertOne(user)
      res.send(result)

    })

    // GETTING USER
    app.get('/api/v2/users', async(req, res)=>{
      const result = await userCollection.find().toArray()
      res.send(result)
    })
   
    // getting foods db
    app.get('/api/v2/foods', async(req, res)=>{
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const skip = (page-1) * limit; 
      const totalData = await foodCollection.countDocuments()
      const pages = Math.ceil(totalData / limit);
      // console.log(pages);   
      const result = await foodCollection.find()
        .skip(skip)
        .limit(limit)
        .toArray()
      res.send({
        result,
        pages
      })
    })

    // POSTING FOOD
    app.post('/api/v2/foods', async(req, res)=>{
        const food = req.body;
       
        const result = await foodCollection.insertOne(food)
        res.send(result)
    })

    // DELETING FOOD
    app.delete('/api/v2/foods/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await foodCollection.deleteOne(query)
      res.send(result)
      
    })



    // getting single food
    app.get('/api/v2/foods/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)} 
      const result = await foodCollection.findOne(query)
      res.send(result)
    })   
    //  Full MODIFYING PATCH
    app.patch('/api/v2/modifyingFood/:id', async(req, res)=>{
      const id = req.params.id;
      const food = req.body;
      
      const query = {_id: new ObjectId(id)}
      const updateDoc = {
        $set:{
          name: food.name,
          imgage: food.image,
          category: food.category,
          description: food.description,
          price: food.price,
          origin: food.origin,
          quantity: food.quantity,
          madeBy: food.madeBy
        }
      }
      const result = await foodCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    // PATCHING SINGLE FOOD
    app.patch('/api/v2/foods/:id', async(req, res)=>{
      const {inputedQuantity} = req.body;
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const updateDoc = {$inc: {count: inputedQuantity, quantity: -inputedQuantity}}
      // console.log(updateDoc);
      const result = await foodCollection.updateOne(query, updateDoc);
      res.send(result)          
    })
     
    // POSTING ORDERS
    app.post('/api/v2/orders', async(req, res)=>{
     ;
      const order = req.body;
      const customerEmail = order.customerEmail
      // console.log(order.customerEmail);
      const orderCollection = client.db('foodieDB').collection(`${customerEmail}`)
      // console.log(orderCollection.namespace);
      // console.log('connected');
      // // console.log(order);
      const result = await orderCollection.insertOne(order)
      res.send(result)
    })
    // GETTING ORDERS
    app.get('/api/v2/orders', tokenVerify, async(req, res)=>{
      // const token = req.cookies.token;
      
      const userEmail = req.query.email;
      if(req.user.email !== userEmail){
        return res.status(403).send({message: 'Forbidden'})
      }
      const orderCollection = client.db('foodieDB').collection(`${userEmail}`)

      // console.log(userEmail);
      // const query = {customerEmail: userEmail}
      const result = await orderCollection.find().toArray()
      res.send(result)    
    })
    // PATCHING ORDERS
    app.patch('/api/v2/orders/:id', async(req, res)=>{
      const id = req.params.id;
      const order = req.body;
     
    
      // console.log(count);
      const query = {_id: id}
      const orderCollection = client.db('foodieDB').collection(`${order.email}`)
      const updateDoc = {
        $set:{
          buyingDate: order.currentDate
        },
        $inc: {
          quantity: order.inputedQuantity  
        }}
      
      const result = await orderCollection.updateOne(query, updateDoc)
      res.send(result)
    
      // console.log(result);  
    })

    // DELETING SINGLE ORDER
    app.delete('/api/v2/orders', async(req, res)=>{
      const id = req.query.id;
      const email = req.query.email;  
      // console.log(id, email);
      const orderCollection = client.db('foodieDB').collection(`${email}`)
      const query = {_id: id};
      const result = await orderCollection.deleteOne(query)
      res.send(result)



    })

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
  res.send('Foodie Restaurant server home page is here')
})

app.listen(port, () => {
  console.log(`Restaurant is runnning on ${port}`)
})