import prisma from "../config/prisma";


/*
 Assign worker to agent
*/
export async function assignWorkerToAgent(
  workerId:number,
  agentId:number
){

  return prisma.user.update({
  where: {
    id: workerId,
  },
  data: {
    assignedAgentId: agentId,
  },
  select: {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    assignedAgentId: true,
    employeeCode: true,
    designation: true,
    status: true,
    active: true,
  },
});

}


/*
 Remove worker from agent
*/
export async function removeWorkerFromAgent(
  workerId:number
){

  return prisma.user.update({

    where:{
      id:workerId
    },

    data:{
      assignedAgentId:null
    },

  });

}


/*
 Get workers under agent
*/
export async function getAgentWorkers(
  agentId:number
){

  return prisma.user.findMany({

    where:{
      assignedAgentId:agentId
    },

    select:{
      id:true,
      name:true,
      email:true,
      phone:true,
      employeeCode:true,
      designation:true,
      site:true
    }

  });

}


/*
 Get worker's agent
*/
export async function getWorkerAgent(
  workerId:number
){

  return prisma.user.findUnique({

    where:{
      id:workerId
    },

    select:{
      assignedAgent:true
    }

  });

}