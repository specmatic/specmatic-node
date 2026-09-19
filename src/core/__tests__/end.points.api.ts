import * as specmatic from '..'
import express from 'express'
import request from 'supertest'

let server
var app

beforeEach(async () => {
    app = express()
    server = await specmatic.startApiCoverageServer(app)
})

afterEach(done => {
    server.close(() => {
        done()
    })
})

const getActuatorEndpoints = async () => {
    const response = await request(server).get('/').accept('application/json').expect(200)
    return response.body
}

test('adds an environment variable indicating api endpoits route is configured', async () => {
    app.get('/', () => {})
    expect(process.env.endpointsAPI).toMatch(/http:\/\/.+?:[0-9]+?/)
})

test('gives list of end points for a single route defined on express app', async () => {
    app.get('/', () => {})
    const endpoints = await getActuatorEndpoints()
    const expectedEndpoints = getExpectedActuatorEndpoints({ '/': ['GET'] })
    expect(endpoints).toStrictEqual(expectedEndpoints)
})

test('gives list of end points for multiple routes defined on express app', async () => {
    app.get('/', () => {})
    app.post('/', () => {})
    app.get('/ping', () => {})
    const endpoints = await getActuatorEndpoints()
    const expectedEndpoints = getExpectedActuatorEndpoints({ '/': ['GET', 'POST'], '/ping': ['GET'] })
    expect(endpoints).toStrictEqual(expectedEndpoints)
})

test('gives list of end points for a multiple routes defined on multiple routers', async () => {
    const userRouter = express.Router()
    userRouter.get('/', function () {})
    userRouter.post('/', function () {})
    userRouter.delete('/', function () {})
    userRouter.put('/', function () {})

    const productRouter = express.Router()
    productRouter.get('/', function () {})
    productRouter.post('/', function () {})

    app.use('/user', userRouter)
    app.use('/product', productRouter)

    const endpoints = await getActuatorEndpoints()
    const expectedEndpoints = getExpectedActuatorEndpoints({ '/product': ['GET', 'POST'], '/user': ['DELETE', 'GET', 'POST', 'PUT'] })
    expect(endpoints).toStrictEqual(expectedEndpoints)
})

test('coverts express route variable syntax to spring boot actuator syntax', async () => {
    app.get('/:id', () => {})
    const endpoints = await getActuatorEndpoints()
    const expectedEndpoints = getExpectedActuatorEndpoints({ '/{id}': ['GET'] })
    expect(endpoints).toStrictEqual(expectedEndpoints)
})

test('coverts express route multiple variable syntax to spring boot actuator syntax', async () => {
    app.get('/:store/:id', () => {})
    const endpoints = await getActuatorEndpoints()
    const expectedEndpoints = getExpectedActuatorEndpoints({ '/{store}/{id}': ['GET'] })
    expect(endpoints).toStrictEqual(expectedEndpoints)
})

test('converts express route with regex path parameter to spring boot actuator syntax', async () => {
    app.get('/api/orders/:orderId([0-9])/items/:itemId([0-9a-f]{24})', () => { });
    const endpoints = await getActuatorEndpoints()
    const expectedEndpoints = getExpectedActuatorEndpoints({ '/api/orders/{orderId}/items/{itemId}': ['GET'] })
    expect(endpoints).toStrictEqual(expectedEndpoints)
})

test('removes escaped dot and backslash in url', async () => {
    app.get('/v1\\.0/:store/:id', () => {})
    const endpoints = await getActuatorEndpoints()
    const expectedEndpoints = getExpectedActuatorEndpoints({ '/v1.0/{store}/{id}': ['GET'] })
    expect(endpoints).toStrictEqual(expectedEndpoints)
})

function getExpectedActuatorEndpoints(endPoints: { [key: string]: string[] }) {
    const structure = {
        contexts: {
            application: {
                mappings: {
                    dispatcherServlets: {
                        dispatcherServlet: [],
                    },
                },
            },
        },
    }
    Object.keys(endPoints).map(key => {
        structure.contexts.application.mappings.dispatcherServlets.dispatcherServlet.push({
            details: {
                requestMappingConditions: {
                    methods: endPoints[key],
                    patterns: [key],
                },
            },
        } as never)
    })
    return structure
}
