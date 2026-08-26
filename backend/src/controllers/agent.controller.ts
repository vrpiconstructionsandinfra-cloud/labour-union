import { Request, Response } from "express";

import {
  assignWorkerToAgent,
  removeWorkerFromAgent,
  getAgentWorkers,
  getWorkerAgent,
} from "../services/agent.service";



/*
 Assign worker to agent
*/
export async function assignWorker(
  req: Request,
  res: Response
) {

  try {
    if (req.user?.role === "SUPER_AGENT") {
      return res.status(403).json({
        success: false,
        message: "Super Agents cannot modify worker assignments."
      });
    }

    const {
      workerId,
      agentId
    } = req.body;

    const targetAgentId = req.user?.role === "AGENT" ? req.user.id : Number(agentId);

    const worker =
      await assignWorkerToAgent(
        Number(workerId),
        targetAgentId
      );


    res.json({
      success:true,
      message:"Worker assigned to agent successfully",
      data:worker
    });


  } catch(error:any){

    res.status(500).json({
      success:false,
      message:error.message
    });

  }

}




/*
 Remove worker from agent
*/
export async function removeWorker(
  req:Request,
  res:Response
){

  try {
    if (req.user?.role === "SUPER_AGENT") {
      return res.status(403).json({
        success: false,
        message: "Super Agents cannot modify worker assignments."
      });
    }

    const workerId =
      Number(req.params.workerId);


    const worker =
      await removeWorkerFromAgent(
        workerId
      );


    res.json({
      success:true,
      message:"Worker removed from agent",
      data:worker
    });


  } catch(error:any){

    res.status(500).json({
      success:false,
      message:error.message
    });

  }

}





/*
 Get workers under agent
*/
export async function workersByAgent(
  req:Request,
  res:Response
){

  try {

    const agentId =
      Number(req.params.agentId);


    const workers =
      await getAgentWorkers(
        agentId
      );


    res.json({
      success:true,
      data:workers
    });


  } catch(error:any){

    res.status(500).json({
      success:false,
      message:error.message
    });

  }

}





/*
 Get worker agent
*/
export async function workerAgent(
  req:Request,
  res:Response
){

  try {

    const workerId =
      Number(req.params.workerId);


    const agent =
      await getWorkerAgent(
        workerId
      );


    res.json({
      success:true,
      data:agent
    });


  } catch(error:any){

    res.status(500).json({
      success:false,
      message:error.message
    });

  }

}