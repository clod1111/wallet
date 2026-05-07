"use client";

import { useState } from "react";
import { ethers } from "ethers";
import type { CSSProperties } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const TOKENS = [
  {
    symbol: "USDT",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    coingeckoId: "tether",
  },
  {
    symbol: "USDC",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    coingeckoId: "usd-coin",
  },
  {
    symbol: "DAI",
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    coingeckoId: "dai",
  },
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const COLORS = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#a855f7"];

type TokenBalance = {
  symbol: string;
  balance: string;
  price: string;
  value: string;
};

type Transfer = {
  hash: string;
  from: string;
  to: string;
  asset: string;
  value: number | null;
  category: string;
};

type NFT = {
  tokenId: string;
  name: string;
  collection: string;
  image: string;
};

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [ethBalance, setEthBalance] = useState("0");
  const [network, setNetwork] = useState("");
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [prices, setPrices] = useState<any>({});
  const [portfolioValue, setPortfolioValue] = useState("0.00");
  const [gasPrice, setGasPrice] = useState("0");
  const [alchemyKey, setAlchemyKey] = useState("");
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  const portfolioChartData = [
    { name: "Mon", value: 1200 },
    { name: "Tue", value: 1800 },
    { name: "Wed", value: 1500 },
    { name: "Thu", value: 2400 },
    { name: "Fri", value: 3200 },
    { name: "Sat", value: 2800 },
    { name: "Sun", value: 4200 },
  ];

  const tokenPieData = [
    { name: "ETH", value: Number(ethBalance) * (prices.ethereum?.usd || 0) || 1 },
    ...tokens.map((t) => ({ name: t.symbol, value: Number(t.value) || 0 })),
  ];

  async function getPrices() {
    const ids = ["ethereum", ...TOKENS.map((t) => t.coingeckoId)].join(",");

    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true`
    );

    const data = await res.json();
    setPrices(data);
    return data;
  }

  async function connectWallet() {
    try {
      if (!(window as any).ethereum) {
        alert("Install MetaMask first");
        return;
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];

      setWalletAddress(address);

      const networkData = await provider.getNetwork();
      setNetwork(networkData.name);

      await loadGasPrice(provider);

      const priceData = await getPrices();
      await loadPortfolio(provider, address, priceData);

      setStatus("Wallet connected successfully.");
    } catch (error) {
      console.log(error);
      setStatus("Wallet connection failed.");
    }
  }

  async function loadGasPrice(provider: ethers.BrowserProvider) {
    const feeData = await provider.getFeeData();

    if (feeData.gasPrice) {
      setGasPrice(Number(ethers.formatUnits(feeData.gasPrice, "gwei")).toFixed(2));
    }
  }

  async function loadPortfolio(
    provider: ethers.BrowserProvider,
    address: string,
    priceData: any
  ) {
    const walletBalance = await provider.getBalance(address);
    const eth = Number(ethers.formatEther(walletBalance));
    setEthBalance(eth.toFixed(6));

    let totalValue = eth * (priceData.ethereum?.usd || 0);
    const loadedTokens: TokenBalance[] = [];

    for (const token of TOKENS) {
      const contract = new ethers.Contract(token.address, ERC20_ABI, provider);

      const rawBalance = await contract.balanceOf(address);
      const decimals = await contract.decimals();

      const tokenBalance = Number(ethers.formatUnits(rawBalance, decimals));
      const tokenPrice = priceData[token.coingeckoId]?.usd || 0;
      const tokenValue = tokenBalance * tokenPrice;

      totalValue += tokenValue;

      loadedTokens.push({
        symbol: token.symbol,
        balance: tokenBalance.toFixed(4),
        price: tokenPrice.toFixed(2),
        value: tokenValue.toFixed(2),
      });
    }

    setTokens(loadedTokens);
    setPortfolioValue(totalValue.toFixed(2));
  }

  async function loadAlchemyData() {
    try {
      if (!walletAddress) {
        alert("Connect wallet first.");
        return;
      }

      if (!alchemyKey) {
        alert("Paste your Alchemy API key first.");
        return;
      }

      setStatus("Loading Alchemy transactions and NFTs...");

      const rpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`;

      const transferResponse = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "alchemy_getAssetTransfers",
          params: [
            {
              fromBlock: "0x0",
              toBlock: "latest",
              fromAddress: walletAddress,
              category: ["external", "erc20", "erc721", "erc1155"],
              withMetadata: true,
              maxCount: "0xA",
              order: "desc",
            },
          ],
        }),
      });

      const transferData = await transferResponse.json();

      const outgoingTransfers = transferData.result?.transfers || [];

      const incomingResponse = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: 2,
          jsonrpc: "2.0",
          method: "alchemy_getAssetTransfers",
          params: [
            {
              fromBlock: "0x0",
              toBlock: "latest",
              toAddress: walletAddress,
              category: ["external", "erc20", "erc721", "erc1155"],
              withMetadata: true,
              maxCount: "0xA",
              order: "desc",
            },
          ],
        }),
      });

      const incomingData = await incomingResponse.json();
      const incomingTransfers = incomingData.result?.transfers || [];

      const combinedTransfers = [...outgoingTransfers, ...incomingTransfers]
        .slice(0, 12)
        .map((tx: any) => ({
          hash: tx.hash,
          from: tx.from || "",
          to: tx.to || "",
          asset: tx.asset || tx.category,
          value: tx.value ?? null,
          category: tx.category,
        }));

      setTransfers(combinedTransfers);

      const nftResponse = await fetch(
        `${rpcUrl}/getNFTsForOwner?owner=${walletAddress}&withMetadata=true&pageSize=8`
      );

      const nftData = await nftResponse.json();

      const loadedNFTs =
        nftData.ownedNfts?.map((nft: any) => ({
          tokenId: nft.tokenId || "",
          name: nft.title || nft.name || "Unnamed NFT",
          collection: nft.contractMetadata?.name || nft.collection?.name || "Unknown Collection",
          image:
            nft.media?.[0]?.gateway ||
            nft.image?.cachedUrl ||
            nft.image?.originalUrl ||
            "",
        })) || [];

      setNfts(loadedNFTs);

      setStatus("Alchemy transactions and NFTs loaded.");
    } catch (error) {
      console.log(error);
      setStatus("Could not load Alchemy data.");
    }
  }

  async function refreshPortfolio() {
    try {
      if (!(window as any).ethereum || !walletAddress) return;

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      await loadGasPrice(provider);

      const priceData = await getPrices();
      await loadPortfolio(provider, walletAddress, priceData);

      setStatus("Analytics refreshed.");
    } catch (error) {
      console.log(error);
      setStatus("Could not refresh analytics.");
    }
  }

  function disconnectWallet() {
    setWalletAddress("");
    setEthBalance("0");
    setNetwork("");
    setTokens([]);
    setPrices({});
    setPortfolioValue("0.00");
    setGasPrice("0");
    setTransfers([]);
    setNfts([]);
    setToAddress("");
    setAmount("");
    setStatus("Wallet disconnected.");
  }

  function copyAddress() {
    navigator.clipboard.writeText(walletAddress);
    setStatus("Address copied.");
  }

  async function sendETH() {
    try {
      if (!(window as any).ethereum) {
        alert("Install MetaMask first");
        return;
      }

      if (!ethers.isAddress(toAddress)) {
        alert("Enter a valid recipient address.");
        return;
      }

      if (!amount || Number(amount) <= 0) {
        alert("Enter a valid ETH amount.");
        return;
      }

      const confirmSend = confirm(
        `Send ${amount} ETH to ${toAddress}? This can use real money.`
      );

      if (!confirmSend) return;

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      setStatus("Waiting for wallet confirmation...");

      const tx = await signer.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(amount),
      });

      setStatus("Transaction sent: " + tx.hash);

      await tx.wait();

      setStatus("Transaction confirmed.");
      await refreshPortfolio();

      setToAddress("");
      setAmount("");
    } catch (error) {
      console.log(error);
      setStatus("Transaction failed or cancelled.");
    }
  }

  const ethUsd = prices.ethereum?.usd || 0;
  const ethChange = prices.ethereum?.usd_24h_change || 0;
  const ethMarketCap = prices.ethereum?.usd_market_cap || 0;
  const ethValue = Number(ethBalance) * ethUsd;
  const tokenTotal = tokens.reduce((sum, t) => sum + Number(t.value), 0);
  const ethAllocation =
    Number(portfolioValue) > 0 ? ((ethValue / Number(portfolioValue)) * 100).toFixed(1) : "0";
  const tokenAllocation =
    Number(portfolioValue) > 0 ? ((tokenTotal / Number(portfolioValue)) * 100).toFixed(1) : "0";

  return (
    <main style={main}>
      <section style={container}>
        <p style={tag}>Web3 NFT + Transaction Dashboard</p>

        <h1 style={title}>My Crypto Wallet App</h1>

        <p style={subtitle}>
          Live prices, wallet analytics, NFTs, transfers, gas data, charts, and ETH sends.
        </p>

        {!walletAddress ? (
          <button onClick={connectWallet} style={primaryButton}>
            Connect MetaMask
          </button>
        ) : (
          <button onClick={disconnectWallet} style={dangerButton}>
            Disconnect Wallet
          </button>
        )}

        {walletAddress && (
          <>
            <div style={portfolioCard}>
              <p style={darkLabel}>Total Portfolio Value</p>
              <h2 style={portfolioValueStyle}>${portfolioValue}</h2>
              <p style={darkLabel}>ETH Price: ${ethUsd}</p>
            </div>

            <div style={analyticsGrid}>
              <div style={analyticsCard}>
                <p style={label}>ETH 24h Change</p>
                <h3 style={{ color: ethChange >= 0 ? "#22c55e" : "#ef4444" }}>
                  {ethChange.toFixed(2)}%
                </h3>
              </div>

              <div style={analyticsCard}>
                <p style={label}>ETH Market Cap</p>
                <h3>${ethMarketCap.toLocaleString()}</h3>
              </div>

              <div style={analyticsCard}>
                <p style={label}>Gas Price</p>
                <h3>{gasPrice} Gwei</h3>
              </div>

              <div style={analyticsCard}>
                <p style={label}>ETH Allocation</p>
                <h3>{ethAllocation}%</h3>
              </div>

              <div style={analyticsCard}>
                <p style={label}>Token Allocation</p>
                <h3>{tokenAllocation}%</h3>
              </div>

              <div style={analyticsCard}>
                <p style={label}>NFTs Loaded</p>
                <h3>{nfts.length}</h3>
              </div>
            </div>

            <div style={grid}>
              <div style={card}>
                <h2>Wallet</h2>

                <p style={label}>Address</p>
                <p style={value}>
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>

                <p style={label}>ETH Balance</p>
                <p style={bigValue}>{ethBalance} ETH</p>

                <p style={label}>ETH Value</p>
                <p style={value}>${ethValue.toFixed(2)}</p>

                <p style={label}>Network</p>
                <p style={value}>{network}</p>

                <div style={buttonRow}>
                  <button onClick={copyAddress} style={smallButton}>
                    Copy
                  </button>

                  <button onClick={refreshPortfolio} style={smallButton}>
                    Refresh
                  </button>
                </div>
              </div>

              <div style={card}>
                <h2>Token Portfolio</h2>

                {tokens.map((token) => (
                  <div key={token.symbol} style={tokenRow}>
                    <div>
                      <strong>{token.symbol}</strong>
                      <p style={smallText}>
                        {token.balance} × ${token.price}
                      </p>
                    </div>

                    <strong>${token.value}</strong>
                  </div>
                ))}
              </div>

              <div style={card}>
                <h2>Send ETH</h2>

                <input
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  placeholder="Recipient address"
                  style={input}
                />

                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount in ETH"
                  style={input}
                />

                <button onClick={sendETH} style={primaryButton}>
                  Send ETH
                </button>

                <p style={warning}>Be careful: transactions can use real crypto.</p>
              </div>
            </div>

            <div style={chartGrid}>
              <div style={card}>
                <h2>Portfolio Growth</h2>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={portfolioChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#38bdf8"
                      strokeWidth={4}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={card}>
                <h2>Token Allocation</h2>

                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={tokenPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label
                    >
                      {tokenPieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={historyCard}>
              <h2>Alchemy Data</h2>

              <p style={label}>
                Paste your Alchemy API key to load real wallet transfers and NFTs.
              </p>

              <input
                value={alchemyKey}
                onChange={(e) => setAlchemyKey(e.target.value)}
                placeholder="Alchemy API key"
                style={input}
              />

              <button onClick={loadAlchemyData} style={primaryButton}>
                Load Transfers + NFTs
              </button>
            </div>

            <div style={historyCard}>
              <h2>Real Transaction Activity</h2>

              {transfers.length === 0 ? (
                <p style={label}>No transfers loaded yet.</p>
              ) : (
                transfers.map((tx, index) => {
                  const incoming =
                    tx.to?.toLowerCase() === walletAddress.toLowerCase();

                  return (
                    <div key={`${tx.hash}-${index}`} style={txRow}>
                      <div>
                        <strong style={{ color: incoming ? "#22c55e" : "#f97316" }}>
                          {incoming ? "Incoming" : "Outgoing"} {tx.asset || tx.category}
                        </strong>

                        <p style={smallText}>
                          Hash: {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                        </p>

                        <p style={smallText}>
                          {incoming ? "From" : "To"}:{" "}
                          {(incoming ? tx.from : tx.to)?.slice(0, 6)}...
                          {(incoming ? tx.from : tx.to)?.slice(-4)}
                        </p>
                      </div>

                      <strong>
                        {tx.value !== null ? tx.value : "NFT"}
                      </strong>
                    </div>
                  );
                })
              )}
            </div>

            <div style={historyCard}>
              <h2>NFT Gallery</h2>

              {nfts.length === 0 ? (
                <p style={label}>No NFTs loaded yet.</p>
              ) : (
                <div style={nftGrid}>
                  {nfts.map((nft, index) => (
                    <div key={`${nft.tokenId}-${index}`} style={nftCard}>
                      {nft.image ? (
                        <img src={nft.image} alt={nft.name} style={nftImage} />
                      ) : (
                        <div style={emptyNft}>No Image</div>
                      )}

                      <h3>{nft.name}</h3>
                      <p style={smallText}>{nft.collection}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {status && <div style={statusBox}>{status}</div>}
      </section>
    </main>
  );
}

const main: CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, #1e3a8a 0%, #0f172a 45%, #020617 100%)",
  color: "white",
  fontFamily: "Arial",
  padding: "40px 20px",
};

const container: CSSProperties = {
  maxWidth: "1150px",
  margin: "0 auto",
  textAlign: "center",
};

const tag: CSSProperties = {
  color: "#38bdf8",
  fontWeight: "bold",
};

const title: CSSProperties = {
  fontSize: "52px",
  marginBottom: "10px",
};

const subtitle: CSSProperties = {
  color: "#cbd5e1",
  marginBottom: "30px",
};

const portfolioCard: CSSProperties = {
  marginTop: "35px",
  background: "linear-gradient(135deg, #38bdf8, #2563eb)",
  color: "#020617",
  borderRadius: "24px",
  padding: "30px",
  boxShadow: "0 25px 70px rgba(0,0,0,0.4)",
};

const portfolioValueStyle: CSSProperties = {
  fontSize: "46px",
  margin: "10px 0",
};

const analyticsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "16px",
  marginTop: "25px",
};

const analyticsCard: CSSProperties = {
  background: "rgba(30, 41, 59, 0.85)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: "18px",
  padding: "18px",
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "24px",
  marginTop: "35px",
};

const chartGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "24px",
  marginTop: "35px",
};

const card: CSSProperties = {
  background: "rgba(30, 41, 59, 0.85)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: "22px",
  padding: "28px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
};

const historyCard: CSSProperties = {
  ...card,
  marginTop: "35px",
  textAlign: "left",
};

const primaryButton: CSSProperties = {
  background: "#38bdf8",
  color: "#020617",
  border: "none",
  padding: "13px 24px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "16px",
  marginTop: "14px",
};

const dangerButton: CSSProperties = {
  background: "#ef4444",
  color: "white",
  border: "none",
  padding: "13px 24px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "16px",
};

const smallButton: CSSProperties = {
  background: "#334155",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "12px",
  cursor: "pointer",
};

const buttonRow: CSSProperties = {
  display: "flex",
  gap: "10px",
  justifyContent: "center",
};

const input: CSSProperties = {
  width: "100%",
  padding: "14px",
  marginTop: "12px",
  borderRadius: "12px",
  border: "1px solid #475569",
  background: "#0f172a",
  color: "white",
  boxSizing: "border-box",
};

const label: CSSProperties = {
  color: "#94a3b8",
  fontSize: "13px",
  marginTop: "18px",
};

const darkLabel: CSSProperties = {
  color: "#1e293b",
  fontSize: "13px",
};

const value: CSSProperties = {
  fontSize: "18px",
};

const bigValue: CSSProperties = {
  fontSize: "30px",
  fontWeight: "bold",
};

const tokenRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 0",
  borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
};

const txRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  padding: "16px 0",
  borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
};

const nftGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "18px",
  marginTop: "20px",
};

const nftCard: CSSProperties = {
  background: "#0f172a",
  borderRadius: "16px",
  padding: "14px",
  border: "1px solid rgba(148, 163, 184, 0.2)",
};

const nftImage: CSSProperties = {
  width: "100%",
  height: "180px",
  objectFit: "cover",
  borderRadius: "12px",
};

const emptyNft: CSSProperties = {
  height: "180px",
  borderRadius: "12px",
  background: "#334155",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const smallText: CSSProperties = {
  color: "#94a3b8",
  fontSize: "13px",
  margin: "4px 0 0",
};

const warning: CSSProperties = {
  color: "#fbbf24",
  fontSize: "13px",
  marginTop: "15px",
};

const statusBox: CSSProperties = {
  marginTop: "30px",
  background: "rgba(15, 23, 42, 0.85)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: "14px",
  padding: "15px",
  color: "#cbd5e1",
};