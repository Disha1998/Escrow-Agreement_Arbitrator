import React, { useEffect, useRef, useState } from 'react';
import { ethers, Contract, providers, Signer } from 'ethers';
import './App.css';
import { ESCROW_CONTRACT_ADDRESS, ESCROW_ABI } from './constants';
import Web3Modal from "web3modal";



function App() {
    // Initialize state variables
    const [agreementId, setAgreementId] = useState();
    // console.log(agreementId);

    const [serviceProviderAddress, setServiceProviderAddress] = useState();
    // console.log(serviceProviderAddress);

    const [clientAddress, setClientAddress] = useState();
    const [arbiter, setArbiter] = useState();
    const [loading, setLoading] = useState(false);

    const [everyAgreementAsClient, setEveryAgreementAsClient] = useState([]);
    const [everyDisputedAgreement, setEveryDisputedAgreement] = useState([]);
    const [everyAgreementAsServiceprovider, setEveryAgreementAsServiceprovider] = useState([]);

    const [amount, setAmount] = useState(0);

    let [fund, setFund] = useState(0);

    const [selectedTab, setSelectedTab] = useState("service provider");

    const [totalNumOfAgreement, setTotalNumOfAgreements] = useState(0);

    const [fundsReleased, setFundsReleased] = useState(false);

    const web3ModalRef = useRef();

    const [walletConnected, setWalletConnected] = useState(false);


    const connectWallet = async () => {
        try {
            await getProviderOrSigner();
            setWalletConnected(true);
        } catch (error) {
            console.log(error);

        }
    }

    const getNumOfAgreements = async () => {
        try {
            const provider = await getProviderOrSigner();
            const contract = getEscrowContractInstance(provider);
            const numOfAgreements = await contract.numOfAgreement();
            setTotalNumOfAgreements(numOfAgreements);

        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (totalNumOfAgreement > 0) {
            fetchAllAgreements();
        }
    }, [totalNumOfAgreement])

    // useEffect(() => {
    //     if(selectedTab === "client")
    //     fetchAllAgreements();
    // },[selectedTab])

    useEffect(() => {
        if (!walletConnected) {
            web3ModalRef.current = new Web3Modal({
                network: "goerli",
                providerOptions: {},
                disableInjectedProvider: false,
            });
            connectWallet().then(async () => {
                await getNumOfAgreements();
            })
        }
    }, []);



    // Create an escrow agreement and deposite fund
    const createAgreement = async () => {
        // Validate inputs
        if (agreementId == null || clientAddress == null || serviceProviderAddress == null || arbiter == null || amount == null) {
            alert('Please enter all required fields.');
            return;
        }
        console.log(ethers.utils.parseEther(amount));
        const signer = await getProviderOrSigner(true);
        const escroContract = getEscrowContractInstance(signer);

        // Send the transaction to create the escrow agreement
        console.log(fund);
        const tx = await escroContract.createEscrowAgreement(agreementId, clientAddress, serviceProviderAddress, arbiter, ethers.utils.parseEther(amount), { value: ethers.utils.parseEther(fund) });

        setLoading(true)
        await tx.wait();
        setAgreementId("");
        setAmount(0);
        // Update the state to reflect the new escrow agreement
        setFundsReleased(false);

        getNumOfAgreements();
        setLoading(false);
        alert('Escrow agreement created successfully.');
        alert('Funds deposited successfully.');
    }



    function ParsedAgreement(agreeId, clientAdd, providerAdd, arbiter, dispute, agreementAmount, clientStake, completed, released, serviceProviderStake) {
        this.agreeId = agreeId;
        this.clientAdd = clientAdd;
        this.providerAdd = providerAdd;
        this.arbiter = arbiter;
        this.dispute = dispute;
        this.agreementAmount = agreementAmount;
        this.clientStake = clientStake
        this.completed = completed;
        this.release = released;
        this.serviceProviderStake = serviceProviderStake
    }


    const fetchAgreementById = async (id) => {
        console.log('erntered fetch by id', id);

        try {
            const provider = await getProviderOrSigner();
            const escroContract = getEscrowContractInstance(provider);
            let agreement = await escroContract.agreements(id);

            const agrmnt = new ParsedAgreement(id, agreement.client, agreement.serviceProvider, agreement.arbiter, agreement.dispute, agreement.agreementAmount.toNumber(), agreement.clientStake.toNumber(), agreement.completed, agreement.fundsReleased, agreement.serviceProviderStake.toNumber())

            console.log(agrmnt, 'agreement by ID');
            return agrmnt;

        } catch (error) {
            console.log(error);
        };
    }




    const fetchAllAgreements = async () => {
        // console.log('erntered fetch all');
        try {
            const allClientAgreements = [];
            const allProviderAgreements = [];
            const allDisputedAgreements = [];
            console.log(totalNumOfAgreement);
            for (let i = 0; i < totalNumOfAgreement; i++) {
                const agreement = await fetchAgreementById(i);
                if (agreement.clientAdd === clientAddress) {
                    allClientAgreements.push(agreement);

                } else if (agreement.providerAdd === clientAddress) {
                    allProviderAgreements.push(agreement)
                } else if (agreement.arbiter == clientAddress) {
                    allDisputedAgreements.push(agreement);
                } else { }

                console.log(agreement.clientAdd, 'agreement');
                // allClientAgreements.push(agreement);
            }
            console.log(allClientAgreements, 'allClientAgreements')
            console.log(allProviderAgreements, 'allProviderAgreements')
            console.log(allDisputedAgreements, 'allDisputedAgreements')
            setEveryAgreementAsClient(allClientAgreements);
            setEveryAgreementAsServiceprovider(allProviderAgreements);
            setEveryDisputedAgreement(allDisputedAgreements);
        } catch (error) {
            console.log(error);
        }
    }


    // resolving dispute 
    // if passing true means decision is in client favour and if false then decision is in service provider's favour
    const resolveDispute = async (id,trueORfalse) => {
        console.log(trueORfalse, ' t or f');
        const signer = await getProviderOrSigner(true);
        const escroContract = getEscrowContractInstance(signer);

        const tx = await escroContract.resolveDispute(id,trueORfalse);
        await tx.wait();
        alert(`Funds transfered to ${trueORfalse ? "Client" : "Service provider"} !!`);

    } 

    // Release the funds to the service provider
    const release = async (id) => {
        // Validate inputs
        console.log(id, 'id');
        const signer = await getProviderOrSigner(true);
        const escroContract = getEscrowContractInstance(signer);

        // Send the transaction to release the funds
        const tx = await escroContract.releaseFunds(id);
        await tx.wait();
        // Update the state to reflect the funds being released
        setFundsReleased(true);
        alert('Funds released successfully.');
    }

    const cancel = async (id) => {
        // Validate inputs
        console.log(id, 'id');
        const signer = await getProviderOrSigner(true);
        const escroContract = getEscrowContractInstance(signer);

        // Send the transaction to release the funds
        const tx = await escroContract.cancel(id);
        await tx.wait();
        // Update the state to reflect the funds being released
        // setFundsReleased(true);
        alert('Agreement canceled.');
    }


    const getProviderOrSigner = async (needSigner = false) => {
        const provider = await web3ModalRef.current.connect();

        const web3Provider = new providers.Web3Provider(provider);
        // console.log((await userAddress).toLowerCase())
        const signerForUserAddress = await web3Provider.getSigner();
        const clientAddress = await signerForUserAddress.getAddress();
        setClientAddress(clientAddress);
        const { chainId } = await web3Provider.getNetwork();
        if (chainId !== 5) {
            window.alert("Please switch to the Goerli network!");
            throw new Error("Please switch to the Goerli network");
        }

        if (needSigner) {
            const signer = web3Provider.getSigner();
            return signer;
        }
        return web3Provider;
    }

    const setDispute = async (id) => {
        const signer = await getProviderOrSigner(true);
        const escroContract = getEscrowContractInstance(signer);

        const tx = await escroContract.setDispute(id);
        await tx.wait();
        alert("Filed dispute!!");
    }

    const workCompleted = async (id) => {
        const signer = await getProviderOrSigner(true);
        const escroContract = getEscrowContractInstance(signer);

        const tx = await escroContract.completedWork(id);
        await tx.wait();
        alert("Marked your work as completed");
    }

    const getEscrowContractInstance = (providerOrSigner) => {
        return new Contract(
            ESCROW_CONTRACT_ADDRESS,
            ESCROW_ABI,
            providerOrSigner
        );
    };

    function renderTabs() {
        if (selectedTab === "client") {
            return renderClientTab();
        } else if (selectedTab === "service provider") {
            return renderServiceproviderTab();
        } else if (selectedTab == "arbiter") {
            return renderArbiterTab();
        }
        return null;
    }

    const stakeProviderEth = async (_agreementId, _stakeAmount) => {
        const signer = await getProviderOrSigner(true);
        const escroContract = getEscrowContractInstance(signer);

        const tx = await escroContract.stakeProviderEth(_agreementId, { value: _stakeAmount });
        await tx.wait();
        alert('Eth staked successfully.');

    }

    function renderClientTab() {
        return (
            <div>
                <h1 style={{ textAlign: "center" }}>agreements where you were client</h1>
                {everyAgreementAsClient && everyAgreementAsClient.map((agrmnt) => {
                    return (
                        <>
                            <div style={{ marginLeft: "30%", marginRight: "30%", marginBottom: '55px', border: "1px solid", padding: "8px" }} className='offset-2 col-5'>

                                <p>Agreement Id : {agrmnt.agreeId}</p>
                                <p>Client : {agrmnt.clientAdd}</p>
                                <p>Service Provider : {agrmnt.providerAdd}</p>
                                <p>Agreement amount : {agrmnt.agreementAmount / 1000000000000000000} Ether</p>
                                <p> Client stake : {agrmnt.clientStake / 2000000000000000000} Ether</p>
                                <p> Service Provider Stake : {agrmnt.serviceProviderStake / 1000000000000000000} Ether</p>

                                {agrmnt.completed ? <div><label>Work Completed : <span style={{ fontSize: "24px", color: "indigo" }}>✓</span> </label></div> :
                                    <div><label>Work Completed : <span style={{ fontSize: "24px", color: "indigo" }}>X</span></label></div>}



                                <p>Fund status : {agrmnt.release ? <span style={{ fontSize: '22px', color: "blueviolet" }}>Released</span> : <span style={{ fontSize: '22px', color: "red" }}>Not Released</span>}</p>

                                {!agrmnt.release ? <div><button style={{ color: "black", backgroundColor: "blue", padding: "5px", margin: "0px 5px 0px 5px" }}
                                    onClick={() => release(agrmnt.agreeId)}
                                >Release Funds </button>


                                    <button style={{ color: "black", backgroundColor: "red", padding: "5px", margin: "0px 5px 0px 5px" }}
                                        onClick={() => cancel(agrmnt.agreeId)}
                                    >Cancel</button></div> : ""}

                                <span> <button style={{ color: "black", backgroundColor: "yellow", padding: "5px", margin: "0px 5px 0px 5px" }}
                                    onClick={() => setDispute(agrmnt.agreeId)}
                                >Dispute</button></span>

                            </div>
                        </>
                    )
                })
                }
            </div >
        )
    }


    function renderArbiterTab() {
        return (
            <div>
                <h1 style={{ textAlign: "center" }}>agreements where you were provide Service</h1>
                {everyDisputedAgreement && everyDisputedAgreement.map((agrmnt) => {
                   
                        return (
                            <>
                                <div style={{ marginLeft: "30%", marginRight: "30%", marginBottom: '55px', border: "1px solid", padding: "8px" }} className='offset-2 col-5'>

                                <p>Arbiter : {agrmnt.arbiter}</p>
                                    <p>Agreement Id : {agrmnt.agreeId}</p>
                                    <p>Dispute : {agrmnt.dispute? "true" : "false"}</p>
                                    <p>Client : {agrmnt.clientAdd}</p>
                                    <p>Service Provider : {agrmnt.providerAdd}</p>
                                    <p>Agreement amount : {agrmnt.agreementAmount / 1000000000000000000} Ether</p>
                                    <p>Client Stake : {agrmnt.clientStake / 2000000000000000000} Ether</p>
                                    <p>Provider's stake : {agrmnt.serviceProviderStake / 1000000000000000000} Ether</p>
                                   
                            <div>
                                <h3>The dicision is yours!! Send funds to..</h3><br></br>
                                <button onClick={() => resolveDispute(agrmnt.agreeId,true)} style={{fontSize:"18px", padding:"7px",margin:"6px",background:"tomato"}}>Client</button>

                                <button onClick={() => resolveDispute(agrmnt.agreeId,true)} style={{fontSize:"18px", padding:"7px",margin:"6px",background:"tomato"}}>Service Provider</button>
                            </div>


                                </div>
                            </>
                        )
                })}
            </div>
        )
    }


    function renderServiceproviderTab() {
        return (
            <div>
                <h1 style={{ textAlign: "center" }}>agreements where you were provide Service</h1>
                {everyAgreementAsServiceprovider && everyAgreementAsServiceprovider.map((agrmnt) => {
                    if (agrmnt.serviceProviderStake === 0) {
                        return (
                            <>

                                <div style={{ marginLeft: "30%", marginRight: "30%", marginBottom: '55px', border: "1px solid", padding: "8px", }}><h2 style={{ textAlign: "center" }}>Stake {agrmnt.agreementAmount / 1000000000000000000} ETH to confirm Contract!! </h2>
                                    <button style={{ marginLeft: "33%", padding: "8px", fontSize: "18px", background: "cyan" }}
                                        onClick={() => stakeProviderEth(agrmnt.agreeId, agrmnt.agreementAmount)}
                                    >Stake {agrmnt.agreementAmount / 1000000000000000000}ETH </button>
                                </div>

                            </>
                        )
                    } else {
                        return (
                            <>
                                <div style={{ marginLeft: "30%", marginRight: "30%", marginBottom: '55px', border: "1px solid", padding: "8px" }} className='offset-2 col-5'>

                                    <p>Agreement Id : {agrmnt.agreeId}</p>
                                    <p>Client : {agrmnt.clientAdd}</p>
                                    <p>Service Provider : {agrmnt.providerAdd}</p>
                                    <p>Agreement amount : {agrmnt.agreementAmount / 1000000000000000000} Ether</p>
                                    <p>Client Stake : {agrmnt.clientStake / 2000000000000000000} Ether</p>
                                    <p>Provider's stake : {agrmnt.serviceProviderStake / 1000000000000000000} Ether</p>
                                    <p>Fund status : {agrmnt.release ? <span style={{ fontSize: '18px', color: "blueviolet" }}>Received</span> : <span style={{ fontSize: '22px', color: "red" }}>Not Received</span>}</p>

                                    {agrmnt.completed ? <h3 style={{ color: "blue", fontSize: '29px' }}>You've done your job!!</h3> : <div><label>Tell client that you completed your work </label><button style={{ color: "black", backgroundColor: "cyan", padding: "5px", fontSize: '18px' }}
                                        onClick={() => workCompleted(agrmnt.agreeId)}
                                    >Completed Work</button></div>}


                                    <button style={{ color: "black", backgroundColor: "yellow", padding: "5px", margin: "0px 5px 0px 5px" }}
                                        onClick={() => setDispute(agrmnt.agreeId)}
                                    >Dispute</button>

                                </div>
                            </>
                        )
                    }

                })}
            </div>
        )
    }
    return (
        <>
            <div>

                <div className="main">
                    <div style={{ textAlign: "center" }}>
                        <h1>Wellcome to Escrow agreement creation </h1><br />
                        <h4>Total Number Of Agreements: {totalNumOfAgreement.toString()}</h4>
                        <p>client : {clientAddress}</p>
                    </div>
                    <div style={{ marginTop: "35px", alignItems: "center", textAlign: "center" }}>
                        <h2>Create Escrow Agreement </h2>

                        <div style={{ marginBottom: "10px" }}>
                            <label>Service Provider </label><input
                                onChange={(e) => {
                                    setServiceProviderAddress(e.target.value)
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: "10px" }}>
                            <label>Arbiter  </label><input
                                onChange={(e) => {
                                    setArbiter(e.target.value)
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: "10px" }}>
                            <label> Agreement Amount </label><input
                                type='number'
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setFund((Number(e.target.value) * 2).toString());
                                }}
                            />
                        </div>
                        {amount > 0 ? <div><p>Note that you have to provide    <span style={{ color: "red", fontSize: "20px" }}>{fund}</span>  Eth to Stake</p></div> : ""}

                        <div style={{ marginBottom: "10px" }}>
                            <label> Agreement ID </label><input
                                type='number'
                                onChange={(e) => {
                                    setAgreementId(e.target.value)
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: "10px" }}>
                            {loading ?
                                <button>Creating...</button>
                                :
                                <button
                                    onClick={createAgreement}
                                >Create Agreement</button>}

                        </div>
                    </div>


                    <div style={{ marginTop: "183px" }}>
                        <h1 style={{ textAlign: 'center' }}>Escrow Agreements created by you</h1>
                        <div className='row'>


                            <div style={{ marginLeft: "40%" }}>
                                <button style={{ padding: "10px", margin: "0 15px 0 5px" }} onClick={() => setSelectedTab("client")}
                                >
                                    Acted as Client
                                </button>
                                <button style={{ padding: "10px", margin: "0 15px 0 15px" }}
                                    onClick={() => setSelectedTab("service provider")}
                                >
                                    Acted as service provider
                                </button>

                                <button style={{ padding: "10px", margin: "0 15px 0 15px" }}
                                    onClick={() => setSelectedTab("arbiter")}
                                >
                                    Acted as Arbiter
                                </button>
                            </div>



                            {renderTabs()}


                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default App;