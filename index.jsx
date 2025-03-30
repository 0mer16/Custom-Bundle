import React from 'react';
import { Page, Layout, Text, Card } from '@shopify/polaris';
import BundleManager from '../components/BundleManager';

const Index = () => {
  return (
    <Page title="Custom Bundles">
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Text as="p">
              Create and manage custom product bundles for your store. Customers can select options like design and size for each item in the bundle.
            </Text>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <BundleManager />
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default Index; 