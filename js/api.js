async function gql(query, variables = {}) {
  const token = localStorage.getItem('jwt');

  console.log('JWT being sent:', localStorage.getItem('jwt'));

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const result = await response.json();

  if (!response.ok || result.errors) {
    console.error('GraphQL error:', result);
    throw new Error(result?.errors?.[0]?.message || 'GraphQL request failed');
  }

  return result.data;
}

async function getCurrentUser() {
  const data = await gql(`
    {
      user {
        id
        login
      }
    }
  `);

  if (!data.user || data.user.length === 0) {
    throw new Error('User not found');
  }

  return data.user[0];
}

async function getUserXp(userId) {
  const data = await gql(
    `
    query GetUserXp($userId: Int!) {
      transaction(
        where: {
          userId: { _eq: $userId }
          type: { _eq: "xp" }
        }
        order_by: { createdAt: asc }
      ) {
        id
        amount
        objectId
        userId
        createdAt
        path
        type
      }
    }
    `,
    { userId }
  );

  return data.transaction || [];
}

async function getUserAuditTransactions(userId) {
  const data = await gql(
    `
    query GetUserAuditTransactions($userId: Int!) {
      transaction(
        where: {
          userId: { _eq: $userId }
          type: { _in: ["up", "down"] }
        }
        order_by: { createdAt: asc }
      ) {
        id
        amount
        objectId
        userId
        createdAt
        path
        type
      }
    }
    `,
    { userId }
  );

  return data.transaction || [];
}

async function getObjectById(objectId) {
  const data = await gql(
    `
    query GetObjectById($objectId: Int!) {
      object(where: { id: { _eq: $objectId } }) {
        id
        name
        type
        attrs
      }
    }
    `,
    { objectId }
  );

  return data.object && data.object.length > 0 ? data.object[0] : null;
}