async function gql(query, variables = {}) {
  const token = localStorage.getItem('jwt');

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (!response.ok || result.errors) {
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

async function getUserAuditStats(userId) {
  try {
    const data = await gql(
      `
      query GetAuditStats($userId: Int!) {
        user(where: { id: { _eq: $userId } }) {
          auditRatio
          totalUp
          totalDown
        }
      }
      `,
      { userId }
    );

    const row = data.user?.[0];
    if (row) {
      const up = Number(row.totalUp) || 0;
      const down = Number(row.totalDown) || 0;
      const ratio = Number(row.auditRatio) || (down === 0 ? 0 : up / down);
      return { up, down, ratio };
    }
  } catch (error) {
    console.warn('Audit summary fields unavailable, falling back to transactions:', error.message);
  }

  const data = await gql(
    `
    query GetAuditTransactions($userId: Int!) {
      transaction(
        where: {
          userId: { _eq: $userId }
          type: { _in: ["up", "down"] }
        }
      ) {
        amount
        type
      }
    }
    `,
    { userId }
  );

  let up = 0;
  let down = 0;

  (data.transaction || []).forEach((row) => {
    const amount = Math.abs(Number(row.amount) || 0);
    if (row.type === 'up') up += amount;
    if (row.type === 'down') down += amount;
  });

  return {
    up,
    down,
    ratio: down === 0 ? (up > 0 ? up : 0) : up / down,
  };
}
