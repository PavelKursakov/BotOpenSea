require('dotenv').config();
const BigNumber = require('bignumber.js');
const opensea = require("opensea-js");
let { OrderSide } = require('opensea-js/lib/types');
const OpenSeaPort = opensea.OpenSeaPort;
const Network = opensea.Network;
const HDWalletProvider = require("@truffle/hdwallet-provider");
const fetch = require('node-fetch');
const args = require('yargs').argv;

const offerPrice = args.offerPrice;
const slug = args.slug;
const timeOut = args.timeOut;

const providerUrl = process.env.PROVIDER;
const walletAddress = process.env.WALLET_ADDRESS;
const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
const network = process.env.NETWORK || "mainnet";
const openSeaApiKey =  process.env.OPENSEA_API_KEY;

if (!walletAddress || !walletPrivateKey || !openSeaApiKey || !providerUrl) {
    console.error("Missing .env variables!");
    return;
};

if (!offerPrice || !timeOut || !slug) {
    console.error("Missing required arguments!");
};

const providerEngine = new HDWalletProvider(walletPrivateKey, providerUrl)
const extraGas = 0
const seaport = new OpenSeaPort(
    providerEngine, {
      networkName: (network == "mainnet" ? Network.Main : Network.Rinkeby),
      apiKey: openSeaApiKey,
    },
  );
// seaport.gasPriceAddition = new BigNumber(extraGas);

async function collection (collectionSlug) {
    let collectionInfo = {};
    const response = await fetch('https://api.opensea.io/api/v1/collection/' + collectionSlug);
    const data = await response.json();
    // console.log(data)
    const address = data.collection.primary_asset_contracts[0].address;
    const supply = data.collection.stats.total_supply;
    const floor = data.collection.stats.floor_price;
    collectionInfo["contract_address"] = address;
    collectionInfo["floor_price"] = floor;
    let urls = [];
    let num = 0;
    while (num < supply) {
        // url = 'https://api.opensea.io/api/v1/assets?order_direction=desc&offset=' + num + '&limit=50&collection=' + collectionSlug;
        url = "https://api.opensea.io/api/v1/assets?collection=" + collectionSlug + "&order_by=pk&order_direction=asc&limit=50&offset=" + num
        urls.push(url);
        num += 50;
    collectionInfo["assetsEndPoints"] = urls;
    };
    return collectionInfo;
};

let tokenIDs = [];

async function tokens (url, osAPIKey) {
    idList = [];
    let server = url;
    headers = {
    "Accept": "application/json",
    "X-API-KEY": osAPIKey
    };
    const handle = async () => {
        const res = await fetch(server, { method: 'GET', headers: headers });
        const json = await res.json();
        assets = json.assets;
        idList = assets.map(e => e.token_id);
        return idList;
    };
    return handle();
};

async function mkOff(tokenAddress,tokenId) {
    try {
        // const asset = await seaport.api.getAsset({
        //tokenAddress: tokenAddress, // string
        // tokenId: tokenId, // string | number | null
        // });
        const order = await seaport.createBuyOrder({ // extracting order to fulfill
        asset: {
            tokenId,
            tokenAddress,
        },
        accountAddress: walletAddress,
        expirationTime: parseInt(timeOut),
        startAmount: parseFloat(offerPrice),
        // listed_before: '2021-12-16T07:19:54',
        });
        console.log("done making offer on #" + tokenId);
    } catch (error) {
        console.log(`error in make offer: ${error}`)
    }
};

const run = async () => {
    console.log("Start . . .")
    const col = await collection(slug);
    console.log(col)
    for (const u of col.assetsEndPoints) {
        console.log(u)
        console.log("Start fetching batch . . .")
        let tkIDs = await tokens(u, openSeaApiKey);
        // console.log(tkIDs);
        console.log("Start making batch offers . . .")
        for (const i of tkIDs) {
            // console.log(walletAddress);
            // console.log(walletPrivateKey);
            // console.log(offerPrice);
            // console.log(timeOut);
            // await new Promise(r => setTimeout(r, 3000));
            console.log("Making offer on #" + i)
            await mkOff(col.contract_address, i);
        };
    };
};

run();