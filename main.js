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

async function mkOff(tokenAddress,tokenId) {
    console.log(`Start making offer on #${tokenId}`)
    try {
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
        console.log(`done making offer on #${tokenId}`);
    } catch (error) {
        console.log(`error in make offer: ${error}`)
    }
};

async function run () {
    console.log("Initializing...")
    let cursor = "";
    let server = `https://api.opensea.io/api/v1/assets?collection_slug=${slug}&order_by=pk&order_direction=desc&limit=50`;
    let globalServer = `https://api.opensea.io/api/v1/assets?collection_slug=${slug}&order_by=pk&order_direction=desc&limit=50&cursor=`;
    while (cursor !== null) {
        headers = {
            "Accept": "application/json",
            "X-API-KEY": openSeaApiKey
            };
        console.log(`Start fetching from: ${server}`)
        const res = await fetch(server, { method: 'GET', headers: headers });
        const json = await res.json();
        let cursor = json.next
        if (cursor == null) {
            for (nft of json.assets) {
                let nftTokenID = nft.token_id;
                let nftAddress = nft.asset_contract.address;
                await mkOff(nftAddress, nftTokenID);
            };
            break
        } else {
            for (nft of json.assets) {
                let nftTokenID = nft.token_id
                let nftAddress = nft.asset_contract.address
                await mkOff(nftAddress, nftTokenID);
            };
            server = globalServer + cursor
            console.log(cursor)
            console.log(server)
            paginations.push(cursor)
        };
    };
};

run();