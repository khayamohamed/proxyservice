const crypto = require("crypto");
const { ethers } = require("ethers");

const DEFAULT_NETWORK = "sepolia";
const FALLBACK_EXPLORERS = {
  1: "https://etherscan.io/tx/",
  11155111: "https://sepolia.etherscan.io/tx/",
  137: "https://polygonscan.com/tx/",
  80002: "https://amoy.polygonscan.com/tx/"
};

function toBool(value) {
  return String(value || "").toLowerCase() === "true";
}

function normalizeHash(hash) {
  return String(hash || "").replace(/^0x/i, "").trim();
}

function createSimulatedTxHash(seed) {
  return `0x${crypto.createHash("sha256").update(seed).digest("hex")}`;
}

function toExplorerUrl(baseUrl, txHash) {
  if (!baseUrl || !txHash) {
    return null;
  }

  return `${String(baseUrl).replace(/\/+$/, "")}/${txHash}`;
}

function getConfig() {
  return {
    networkLabel: String(process.env.BLOCKCHAIN_NETWORK || DEFAULT_NETWORK).trim(),
    rpcUrl: String(process.env.BLOCKCHAIN_RPC_URL || "").trim(),
    privateKey: String(process.env.BLOCKCHAIN_PRIVATE_KEY || "").trim(),
    targetAddress: String(process.env.BLOCKCHAIN_TARGET_ADDRESS || "").trim(),
    explorerBaseUrl: String(process.env.BLOCKCHAIN_EXPLORER_BASE_URL || "").trim(),
    required: toBool(process.env.BLOCKCHAIN_REQUIRED),
    waitConfirmation: toBool(process.env.BLOCKCHAIN_WAIT_CONFIRMATION)
  };
}

function isBlockchainConfigured() {
  const { rpcUrl, privateKey } = getConfig();
  return Boolean(rpcUrl && privateKey);
}

async function writeRecordToChain({ entityType, entityId, action, hash, metadata }) {
  const config = getConfig();
  const cleanHash = normalizeHash(hash);
  const seed = `${entityType}|${entityId}|${action}|${cleanHash}|${Date.now()}|${Math.random()}`;

  if (!isBlockchainConfigured()) {
    return {
      mode: "simulated",
      network: config.networkLabel,
      txHash: createSimulatedTxHash(seed),
      explorerUrl: null,
      recordedAt: new Date()
    };
  }

  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.privateKey, provider);
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    const payload = {
      app: "proxyservices",
      entityType,
      entityId,
      action,
      hash: `0x${cleanHash}`,
      metadata: metadata || {},
      recordedAt: new Date().toISOString()
    };

    const tx = await wallet.sendTransaction({
      to: config.targetAddress || wallet.address,
      value: 0n,
      data: ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify(payload)))
    });

    let receipt = null;
    if (config.waitConfirmation) {
      receipt = await tx.wait(1);
    }

    const explorerBaseUrl = config.explorerBaseUrl || FALLBACK_EXPLORERS[chainId] || "";
    return {
      mode: "onchain",
      network: config.networkLabel || network.name || `chain-${chainId}`,
      txHash: tx.hash,
      explorerUrl: toExplorerUrl(explorerBaseUrl, tx.hash),
      blockNumber: receipt ? receipt.blockNumber : null,
      recordedAt: new Date()
    };
  } catch (error) {
    if (config.required) {
      throw new Error(`Blockchain write failed: ${error.message}`);
    }

    return {
      mode: "fallback",
      network: config.networkLabel,
      txHash: createSimulatedTxHash(`fallback|${seed}`),
      explorerUrl: null,
      recordedAt: new Date()
    };
  }
}

module.exports = {
  getBlockchainConfig: getConfig,
  isBlockchainConfigured,
  writeRecordToChain
};
